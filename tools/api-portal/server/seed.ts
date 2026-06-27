/**
 * Seed script — pre-populates the vault with all discovered API key names
 * from world-cup, textbook-manager, and memo projects.
 *
 * Values are set to "FILL_ME_IN" placeholders. Replace them via the portal UI.
 * Safe to re-run: skips keys that already exist (matched by label + envVarName).
 * Existing real values are never overwritten.
 *
 * Run AFTER completing first-run setup at http://localhost:4243:
 *   tsx server/seed.ts
 */

import { readVault, writeVault, hashValue, isVaultFilePresent } from "./vault.js";
import { isKeychainSetup } from "./keychain.js";
import { nanoid } from "nanoid";
import type { ApiKey, SyncTarget, VaultHistory } from "./vault.js";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

// ─── Key catalogue ────────────────────────────────────────────────────────────
// Each entry includes a `_seedId` used to detect duplicates on re-run.
// This avoids matching on envVarName alone (multiple projects can share a name).

type SeedKeyDef = Omit<ApiKey, "id" | "createdAt" | "updatedAt"> & { _seedId: string };

const SEED_KEYS: SeedKeyDef[] = [
  // ── World Cup: RapidAPI (browser) ───────────────────────────────────────
  {
    _seedId: "world-cup:VITE_RAPIDAPI_KEY",
    serviceGroup: "RapidAPI",
    label: "RapidAPI Shared Key (browser)",
    envVarName: "VITE_RAPIDAPI_KEY",
    value: "FILL_ME_IN",
    endpoint:
      "https://zafronix-fifa-world-cup-api.p.rapidapi.com/fifa/worldcup/v1/tournaments/2026",
    testMethod: "GET",
    testHeaders: {
      "x-rapidapi-host": "zafronix-fifa-world-cup-api.p.rapidapi.com",
    },
    notes:
      "One RapidAPI key for all hubs: Zafronix, Football Data, SportAPI7, WC2026 Teams, WC2026 Live, Open Weather, Odds Intelligence. Subscribe to each listing at rapidapi.com. world-cup clients: ZafronixClient, FootballDataClient, SportAPI7Client, WorldCup2026Client, WorldCup2026LiveClient, WeatherClient, OddsIntelligenceClient.",
  },

  // ── World Cup: RapidAPI (server proxies) ────────────────────────────────
  {
    _seedId: "world-cup:RAPIDAPI_KEY",
    serviceGroup: "RapidAPI",
    label: "RapidAPI Shared Key (server)",
    envVarName: "RAPIDAPI_KEY",
    value: "FILL_ME_IN",
    endpoint:
      "https://free-api-live-football-data.p.rapidapi.com/football-get-matches-by-date?date=20260626",
    testMethod: "GET",
    testHeaders: {
      "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com",
    },
    notes:
      "Same value as VITE_RAPIDAPI_KEY — used by Vercel edge proxies (api/footballdata, sportapi, wc2026, wc-live, weather, odds, zafronix). Sync mirrors browser key automatically.",
  },

  // ── Textbook Manager: Sentry renderer ────────────────────────────────────
  {
    _seedId: "textbook-manager:VITE_SENTRY_DSN",
    serviceGroup: "Sentry — Textbook Manager",
    label: "Sentry DSN (renderer) — Textbook Manager",
    envVarName: "VITE_SENTRY_DSN",
    value: "FILL_ME_IN",
    notes:
      "Vite/renderer-process Sentry DSN for textbook-manager. app/src/renderer/sentry-renderer.ts.",
  },

  // ── Textbook Manager: Sentry main process ────────────────────────────────
  {
    _seedId: "textbook-manager:SENTRY_DSN",
    serviceGroup: "Sentry — Textbook Manager",
    label: "Sentry DSN (main process) — Textbook Manager",
    envVarName: "SENTRY_DSN",
    value: "FILL_ME_IN",
    notes:
      "Electron main-process Sentry DSN for textbook-manager. app/src/sentry-main.ts. Different project from memo.",
  },

  // ── Textbook Manager: Sentry source-map token ────────────────────────────
  {
    _seedId: "textbook-manager:SENTRY_AUTH_TOKEN",
    serviceGroup: "Sentry — Textbook Manager",
    label: "Sentry Auth Token (source maps) — Textbook Manager",
    envVarName: "SENTRY_AUTH_TOKEN",
    value: "FILL_ME_IN",
    notes:
      "Sentry source-map upload token for textbook-manager production builds. Never expose client-side.",
  },

  {
    _seedId: "textbook-manager:SENTRY_ORG",
    serviceGroup: "Sentry — Textbook Manager",
    label: "Sentry Org Slug — Textbook Manager",
    envVarName: "SENTRY_ORG",
    value: "FILL_ME_IN",
    notes: "Your Sentry org slug for textbook-manager.",
  },

  {
    _seedId: "textbook-manager:SENTRY_PROJECT",
    serviceGroup: "Sentry — Textbook Manager",
    label: "Sentry Project Slug — Textbook Manager",
    envVarName: "SENTRY_PROJECT",
    value: "FILL_ME_IN",
    notes: "Your Sentry project slug for textbook-manager.",
  },

  // ── Memo: Gemini AI ──────────────────────────────────────────────────────
  {
    _seedId: "memo:GEMINI_API_KEY",
    serviceGroup: "Google Gemini",
    label: "Gemini API Key",
    envVarName: "GEMINI_API_KEY",
    value: "FILL_ME_IN",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    testMethod: "GET",
    notes:
      "Google Gemini AI key. memo: app/src/server/geminiKeychain.ts. Also readable from macOS Keychain.",
  },

  // ── Memo: Sentry ─────────────────────────────────────────────────────────
  {
    _seedId: "memo:SENTRY_DSN",
    serviceGroup: "Sentry — Memo",
    label: "Sentry DSN — Memo",
    envVarName: "SENTRY_DSN",
    value: "FILL_ME_IN",
    notes:
      "Sentry DSN for the memo app. Separate Sentry project from textbook-manager — different DSN value.",
  },
];

// ─── Sync targets ─────────────────────────────────────────────────────────────

type SeedTarget = {
  name: string;
  envFilePath: string;
  seedKeyIds: string[]; // references _seedId from SEED_KEYS
};

const SEED_TARGETS: SeedTarget[] = [
  {
    name: "World Cup Tracker",
    envFilePath: join(HOME, "Developer/world-cup/.env.local"),
    seedKeyIds: ["world-cup:VITE_RAPIDAPI_KEY", "world-cup:RAPIDAPI_KEY"],
  },
  {
    name: "Textbook Manager",
    envFilePath: join(HOME, "Developer/textbook-manager/.env.local"),
    seedKeyIds: [
      "textbook-manager:VITE_SENTRY_DSN",
      "textbook-manager:SENTRY_DSN",
      "textbook-manager:SENTRY_AUTH_TOKEN",
      "textbook-manager:SENTRY_ORG",
      "textbook-manager:SENTRY_PROJECT",
    ],
  },
  {
    name: "Memo",
    envFilePath: join(HOME, "Developer/memo/.env.local"),
    seedKeyIds: [
      "memo:GEMINI_API_KEY",
      "memo:SENTRY_DSN",
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function histEntry(key: { id: string; label: string; envVarName: string }): VaultHistory {
  return {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    action: "create",
    keyId: key.id,
    label: key.label,
    envVarName: key.envVarName,
    newValueHash: hashValue(key.envVarName),
    meta: "seeded from seed.ts",
  };
}

// Detect stale legacy seed entries from previous run (before per-project Sentry split)
function findLegacyEntry(vault: { keys: ApiKey[] }, envVarName: string, label: string): ApiKey | undefined {
  return vault.keys.find(
    (k) => k.envVarName === envVarName && k.label === label
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const setup = await isKeychainSetup();
  if (!setup) {
    console.error(
      "\n⚠  Vault not set up yet. Complete first-run setup at http://localhost:4243 first.\n"
    );
    process.exit(1);
  }

  if (!isVaultFilePresent()) {
    console.log("  Vault file not found — creating fresh vault…");
  }

  const vault = await readVault();
  const now = new Date().toISOString();

  // ── Detect and remove legacy ambiguous SENTRY_DSN entry if present ───────
  // (The first seed run before this fix created a single SENTRY_DSN with label
  // "Sentry DSN — Textbook Manager" that was shared across both projects.)
  const legacyLabels = [
    { label: "Sentry DSN — Textbook Manager (main process)", envVarName: "SENTRY_DSN" },
    { label: "Sentry DSN — Textbook Manager", envVarName: "SENTRY_DSN" },
  ];
  let legacyRemoved = 0;
  for (const { label, envVarName } of legacyLabels) {
    const legacy = findLegacyEntry(vault, envVarName, label);
    if (legacy && (legacy.value === "FILL_ME_IN" || legacy.value === "")) {
      vault.keys = vault.keys.filter((k) => k.id !== legacy.id);
      console.log(`  🗑  removed legacy entry: ${envVarName} "${label}"`);
      legacyRemoved++;
    }
  }

  // ── Build seedId → vault key id map ─────────────────────────────────────
  // Store seedId in notes as a marker to detect re-runs
  const seedIdToKey = new Map<string, ApiKey>();
  for (const k of vault.keys) {
    const match = k.notes?.match(/\[seed:([^\]]+)\]/);
    if (match) seedIdToKey.set(match[1], k);
  }

  let keysAdded = 0;
  let keysSkipped = 0;
  const addedBySeedId = new Map<string, string>(); // seedId → vault key id

  for (const seedKey of SEED_KEYS) {
    const { _seedId, ...keyData } = seedKey;

    // Already exists from a previous seed run (by seed marker)
    if (seedIdToKey.has(_seedId)) {
      const existing = seedIdToKey.get(_seedId)!;
      addedBySeedId.set(_seedId, existing.id);
      console.log(`  ⏭  skip   ${keyData.envVarName} [${_seedId}]`);
      keysSkipped++;
      continue;
    }

    // Fallback: match legacy entries without seed marker (same envVarName + serviceGroup)
    const legacyMatch = vault.keys.find(
      (k) =>
        k.envVarName === keyData.envVarName &&
        k.serviceGroup === keyData.serviceGroup &&
        !k.notes?.includes("[seed:")
    );
    if (legacyMatch) {
      legacyMatch.notes = `${legacyMatch.notes ?? ""}\n[seed:${_seedId}]`.trim();
      legacyMatch.serviceGroup = keyData.serviceGroup;
      legacyMatch.label = keyData.label;
      seedIdToKey.set(_seedId, legacyMatch);
      addedBySeedId.set(_seedId, legacyMatch.id);
      console.log(`  ↻  linked  ${keyData.envVarName} [${_seedId}] (existing entry)`);
      keysSkipped++;
      continue;
    }

    const newKey: ApiKey = {
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      ...keyData,
      // Embed seedId in notes for future idempotent re-runs
      notes: `${keyData.notes ?? ""}\n[seed:${_seedId}]`.trim(),
    };
    vault.keys.push(newKey);
    vault.history.push(histEntry(newKey));
    addedBySeedId.set(_seedId, newKey.id);
    console.log(`  ✓  added  ${keyData.envVarName} — ${keyData.serviceGroup} [${_seedId}]`);
    keysAdded++;
  }

  // ── Sync targets ─────────────────────────────────────────────────────────
  let targetsAdded = 0;
  let targetsUpdated = 0;

  for (const st of SEED_TARGETS) {
    const keyIds = st.seedKeyIds
      .map((sid) => addedBySeedId.get(sid))
      .filter((id): id is string => !!id);

    const existing = vault.syncTargets.find((t) => t.name === st.name);
    if (existing) {
      // Merge any new keyIds
      const before = existing.keyIds.length;
      const merged = [...new Set([...existing.keyIds, ...keyIds])];
      existing.keyIds = merged;
      if (merged.length !== before) {
        targetsUpdated++;
        console.log(`  ↻  updated sync target "${st.name}" (${merged.length - before} new keys)`);
      } else {
        console.log(`  ⏭  skip   sync target "${st.name}" (unchanged)`);
      }
      continue;
    }

    const target: SyncTarget = {
      id: nanoid(),
      name: st.name,
      envFilePath: st.envFilePath,
      keyIds,
    };
    vault.syncTargets.push(target);
    const envExists = existsSync(st.envFilePath);
    console.log(
      `  ✓  added  sync target "${st.name}"${envExists ? "" : " (file will be created on first sync)"}`
    );
    targetsAdded++;
  }

  await writeVault(vault);

  console.log(`
─────────────────────────────────────────────
  Seed complete
  Legacy entries removed: ${legacyRemoved}
  Keys added:             ${keysAdded}  (${keysSkipped} already existed)
  Sync targets added:     ${targetsAdded}  updated: ${targetsUpdated}
─────────────────────────────────────────────

  Next steps:
  1. Open http://localhost:4243
  2. For each key showing "FILL_ME_IN", click ✏ Edit and paste the real value
  3. Click "Sync All" to write keys to all project .env.local files

  ┌─ Key acquisition guide ─────────────────────────────────────────────┐
  │  VITE_RAPIDAPI_KEY + RAPIDAPI_KEY → rapidapi.com → My Apps (same key) │
  │  SENTRY_DSN              → sentry.io → Project Settings → SDK Setup│
  │  SENTRY_AUTH_TOKEN       → sentry.io → Settings → Auth Tokens       │
  │  GEMINI_API_KEY          → aistudio.google.com → Get API Key        │
  └──────────────────────────────────────────────────────────────────────┘
`);
}

seed().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
