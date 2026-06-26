/**
 * Remove duplicate vault keys and clean sync-target keyIds.
 *
 * Rules:
 * - Within each sync target: at most one key per envVarName (keep seed-marked / newest).
 * - Globally: remove keys not linked to any target if another key with same envVarName
 *   is linked to the same target(s).
 * - SENTRY_DSN: two entries allowed when linked to different projects (Memo vs Textbook).
 *
 * Run: tsx server/dedupe.ts
 */

import { readVault, writeVault, type ApiKey, type SyncTarget } from "./vault.js";

function scoreKey(k: ApiKey): number {
  let s = 0;
  if (k.notes?.includes("[seed:")) s += 100;
  if (k.serviceGroup.includes("—")) s += 10; // prefer "Sentry — Textbook Manager" over "Sentry"
  if (k.value !== "FILL_ME_IN" && k.value.trim() !== "") s += 50;
  s += new Date(k.updatedAt).getTime() / 1e15;
  return s;
}

function pickKeeper(keys: ApiKey[]): ApiKey {
  return [...keys].sort((a, b) => scoreKey(b) - scoreKey(a))[0];
}

function dedupeTargetKeyIds(target: SyncTarget, keyById: Map<string, ApiKey>): string[] {
  const byEnv = new Map<string, ApiKey[]>();
  for (const id of target.keyIds) {
    const k = keyById.get(id);
    if (!k) continue;
    const list = byEnv.get(k.envVarName) ?? [];
    list.push(k);
    byEnv.set(k.envVarName, list);
  }
  const kept: string[] = [];
  for (const keys of byEnv.values()) {
    kept.push(pickKeeper(keys).id);
  }
  return kept;
}

async function dedupe() {
  const vault = await readVault();
  const before = vault.keys.length;
  const keyById = new Map(vault.keys.map((k) => [k.id, k]));

  // 1. Dedupe keyIds within each sync target (one envVarName per target)
  for (const target of vault.syncTargets) {
    const beforeIds = target.keyIds.length;
    target.keyIds = dedupeTargetKeyIds(target, keyById);
    if (target.keyIds.length !== beforeIds) {
      console.log(`  ↻ ${target.name}: ${beforeIds} → ${target.keyIds.length} key refs`);
    }
  }

  // 2. Keep keys referenced by any target, plus unreferenced keys with unique envVarName globally
  const referenced = new Set(vault.syncTargets.flatMap((t) => t.keyIds));

  // Among unreferenced keys, drop duplicates of referenced keys (same envVarName)
  const referencedEnvVars = new Set(
    [...referenced].map((id) => keyById.get(id)?.envVarName).filter(Boolean) as string[]
  );

  const removed: string[] = [];
  vault.keys = vault.keys.filter((k) => {
    if (referenced.has(k.id)) return true;
    // Unreferenced: keep only if envVarName isn't already covered by a referenced key
    // Exception: SENTRY_DSN unreferenced duplicates always drop if another SENTRY_DSN is referenced
    const dupOfReferenced = referencedEnvVars.has(k.envVarName);
    if (dupOfReferenced) {
      removed.push(`${k.envVarName} (${k.serviceGroup}) unreferenced duplicate`);
      return false;
    }
    return true;
  });

  // 3. Global dedupe: same envVarName + same serviceGroup
  const groups = new Map<string, ApiKey[]>();
  for (const k of vault.keys) {
    const gk = `${k.envVarName}::${k.serviceGroup}`;
    const list = groups.get(gk) ?? [];
    list.push(k);
    groups.set(gk, list);
  }

  const keepIds = new Set<string>();
  for (const keys of groups.values()) {
    if (keys.length === 1) {
      keepIds.add(keys[0].id);
    } else {
      const keeper = pickKeeper(keys);
      keepIds.add(keeper.id);
      for (const k of keys) {
        if (k.id !== keeper.id) {
          removed.push(`${k.envVarName} (${k.serviceGroup}) id=${k.id.slice(0, 8)}`);
        }
      }
    }
  }

  vault.keys = vault.keys.filter((k) => keepIds.has(k.id));

  // Re-clean targets after global dedupe
  const keyById2 = new Map(vault.keys.map((k) => [k.id, k]));
  for (const target of vault.syncTargets) {
    target.keyIds = dedupeTargetKeyIds(
      { ...target, keyIds: target.keyIds.filter((id) => keepIds.has(id)) },
      keyById2
    );
  }

  await writeVault(vault, { destructive: true });

  console.log(`
Dedupe complete
  Keys before:  ${before}
  Keys after:   ${vault.keys.length}
  Removed:      ${removed.length}
`);
  if (removed.length > 0) {
    console.log("Removed:");
    for (const r of removed) console.log(`  - ${r}`);
  }
  console.log("\nSync targets:");
  for (const t of vault.syncTargets) {
    const names = t.keyIds
      .map((id) => keyById2.get(id)?.envVarName)
      .filter(Boolean);
    console.log(`  ${t.name}: ${names.join(", ") || "(none)"}`);
  }
}

dedupe().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
