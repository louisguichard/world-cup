import { Router } from "express";
import { existsSync } from "node:fs";
import { unlink, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import {
  readVault,
  writeVault,
  hashValue,
  isVaultFilePresent,
  initMasterKey,
  getMasterKey,
  evictMasterKeyCache,
  VaultNotSetupError,
  type ApiKey,
  type VaultHistory,
  type SyncTarget,
  type VaultData,
} from "./vault.js";
import {
  isKeychainSetup,
  isKeytarAvailable,
  isSessionUnlocked,
  unlockSession,
  lockSession,
  deleteKeychainKey,
} from "./keychain.js";
import { maskKey, maskKeys } from "./mask.js";
import { revealRateLimit } from "./middleware/rateLimit.js";
import {
  ApiKeyCreateSchema,
  ApiKeyUpdateSchema,
  SyncTargetCreateSchema,
  SetupSchema,
  UnlockSchema,
  VaultResetSchema,
  JsonKeyImportSchema,
  ProjectRescanSchema,
  ApplyDiscoveredSchema,
} from "./schemas.js";
import { testApiKey } from "./testKey.js";
import { testAllRapidApiHosts, testAllRapidApiEndpoints } from "./rapidApiTest.js";
import { syncToEnvFile } from "./sync.js";
import { isPlaceholderValue, parseEnvFile } from "./envParse.js";
import {
  importAllKnownProjects,
  importProjectEnvFile,
  propagateEnvVarValue,
} from "./envImport.js";
import { KNOWN_PROJECTS } from "./projectCatalog.js";
import { importJsonEntries } from "./jsonKeyImport.js";
import {
  applyDiscoveredVars,
  scanProjectForVault,
  type ProjectScanResult,
} from "./projectScan.js";
import { applyScanUsageUpdates } from "./keyUsage.js";
import forge from "node-forge";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function historyEntry(
  action: VaultHistory["action"],
  key: { id: string; label: string; envVarName: string },
  opts: { oldValueHash?: string; newValueHash?: string; meta?: string } = {}
): VaultHistory {
  return {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    action,
    keyId: key.id,
    label: key.label,
    envVarName: key.envVarName,
    ...opts,
  };
}

function trimHistory(vault: VaultData): VaultData {
  return {
    ...vault,
    history: vault.history.slice(-500), // keep at most 500 in vault; return 100 via API
  };
}

// ─── Status ───────────────────────────────────────────────────────────────────

router.get("/status", async (_req, res) => {
  const [setup] = await Promise.all([isKeychainSetup()]);
  res.json({
    keychainSetup: setup,
    vaultExists: isVaultFilePresent(),
    keychainAvailable: isKeytarAvailable(),
    sessionUnlocked: isSessionUnlocked(),
  });
});

// ─── First-run setup ──────────────────────────────────────────────────────────

router.post("/setup", async (req, res) => {
  const alreadySetup = await isKeychainSetup();
  if (alreadySetup) {
    res.status(409).json({ error: "Vault is already set up." });
    return;
  }

  const parsed = SetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  await initMasterKey(parsed.data.passphrase);
  res.json({ ok: true });
});

// ─── Session unlock (keytar fallback) ────────────────────────────────────────

router.post("/unlock", async (req, res) => {
  if (isKeytarAvailable()) {
    res.status(400).json({ error: "Keychain is available; use /setup instead." });
    return;
  }

  const parsed = UnlockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Passphrase required." });
    return;
  }

  // Derive key from passphrase using same algorithm as initMasterKey.
  // Without keytar we can't verify against stored value — just derive and store in session.
  // The vault read will fail if the key is wrong (AES-GCM tag verification).
  const salt = forge.random.getBytesSync(16);
  const derivedBytes = forge.pkcs5.pbkdf2(parsed.data.passphrase, salt, 100000, 32, "sha256");
  const derivedHex = forge.util.bytesToHex(derivedBytes);
  await unlockSession(derivedHex);

  res.json({ ok: true, sessionUnlocked: true });
});

// ─── Keys ─────────────────────────────────────────────────────────────────────

router.get("/keys", async (_req, res) => {
  const vault = await readVault();
  res.json({ keys: maskKeys(vault.keys) });
});

router.post("/keys", async (req, res) => {
  const parsed = ApiKeyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const vault = await readVault();
  const now = new Date().toISOString();

  const duplicate = vault.keys.find(
    (k) =>
      k.envVarName === parsed.data.envVarName &&
      k.serviceGroup === parsed.data.serviceGroup
  );
  if (duplicate) {
    res.status(409).json({
      error: `A key with env var "${parsed.data.envVarName}" already exists in "${parsed.data.serviceGroup}". Edit the existing key instead.`,
      existingId: duplicate.id,
    });
    return;
  }

  const newKey: ApiKey = {
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    ...parsed.data,
    endpoint: parsed.data.endpoint || undefined,
  };

  vault.keys.push(newKey);
  vault.history.push(historyEntry("create", newKey, { newValueHash: hashValue(newKey.value) }));
  await writeVault(trimHistory(vault));
  res.status(201).json({ key: maskKey(newKey) });
});

router.put("/keys/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = ApiKeyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const vault = await readVault();
  const idx = vault.keys.findIndex((k) => k.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Key not found." });
    return;
  }

  const existing = vault.keys[idx];
  const update = parsed.data;
  const valueChanged = update.value !== undefined && update.value !== existing.value;

  const oldHash = valueChanged ? hashValue(existing.value) : undefined;
  const newHash = valueChanged && update.value ? hashValue(update.value) : undefined;

  vault.keys[idx] = {
    ...existing,
    ...update,
    endpoint: update.endpoint === "" ? undefined : (update.endpoint ?? existing.endpoint),
    disabledReason:
      update.disabledReason === null ? undefined : (update.disabledReason ?? existing.disabledReason),
    disabledAt: update.disabledAt === null ? undefined : (update.disabledAt ?? existing.disabledAt),
    missingFromProjects:
      update.missingFromProjects === null
        ? undefined
        : (update.missingFromProjects ?? existing.missingFromProjects),
    updatedAt: new Date().toISOString(),
  };

  if (update.disabled === false) {
    vault.keys[idx].disabled = false;
    vault.keys[idx].disabledReason = undefined;
    vault.keys[idx].disabledAt = undefined;
    vault.keys[idx].missingFromProjects = undefined;
  }

  if (valueChanged && update.value) {
    const shared = propagateEnvVarValue(
      vault,
      vault.keys[idx].envVarName,
      update.value,
      vault.keys[idx].id
    );
    if (shared > 0) {
      vault.history.push(
        historyEntry("update", vault.keys[idx], {
          meta: `shared with ${shared} other key slot(s) using ${vault.keys[idx].envVarName}`,
        })
      );
    }
  }

  vault.history.push(
    historyEntry("update", vault.keys[idx], { oldValueHash: oldHash, newValueHash: newHash })
  );
  await writeVault(trimHistory(vault));
  res.json({ key: maskKey(vault.keys[idx]) });
});

router.delete("/keys/:id", async (req, res) => {
  const { id } = req.params;
  const vault = await readVault();
  const idx = vault.keys.findIndex((k) => k.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Key not found." });
    return;
  }

  const deleted = vault.keys[idx];
  vault.keys.splice(idx, 1);
  vault.history.push(
    historyEntry("delete", deleted, { oldValueHash: hashValue(deleted.value) })
  );

  // Destructive op → backup before write
  await writeVault(trimHistory(vault), { destructive: true });
  res.json({ ok: true });
});

router.post("/keys/import-json", async (req, res) => {
  const parsed = JsonKeyImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid JSON import." });
    return;
  }
  const vault = await readVault();
  const { added, updated } = importJsonEntries(vault, parsed.data.entries);
  await writeVault(trimHistory(vault));
  res.json({ added, updated, keys: maskKeys(vault.keys) });
});

// ─── Reveal ───────────────────────────────────────────────────────────────────

router.get("/keys/:id/reveal", revealRateLimit, async (req, res) => {
  const { id } = req.params;
  const vault = await readVault();
  const key = vault.keys.find((k) => k.id === id);
  if (!key) {
    res.status(404).json({ error: "Key not found." });
    return;
  }

  vault.history.push(historyEntry("update", key, { meta: "value revealed" }));
  await writeVault(trimHistory(vault));
  res.json({ value: key.value });
});

// ─── Test ─────────────────────────────────────────────────────────────────────

router.post("/keys/:id/test", async (req, res) => {
  const { id } = req.params;
  const vault = await readVault();
  const idx = vault.keys.findIndex((k) => k.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Key not found." });
    return;
  }

  const key = vault.keys[idx];
  const result = await testApiKey(key);

  vault.keys[idx] = {
    ...key,
    lastTestedAt: new Date().toISOString(),
    lastTestStatus: result.status,
    lastTestLatencyMs: result.latencyMs,
    updatedAt: new Date().toISOString(),
  };
  vault.history.push(
    historyEntry("test", key, {
      meta: `${result.status} ${result.ok ? "OK" : "FAIL"} ${result.latencyMs}ms`,
    })
  );
  await writeVault(trimHistory(vault));
  res.json(result);
});

router.post("/keys/test-all", async (req, res) => {
  const body = (req.body ?? {}) as { includeDisabled?: boolean; onlyUntested?: boolean };
  const vault = await readVault();
  const now = new Date().toISOString();
  const outcomes: Array<{
    keyId: string;
    envVarName: string;
    label: string;
    ok: boolean;
    status: number;
    latencyMs: number;
    skipped?: string;
  }> = [];

  for (const key of vault.keys) {
    if (key.disabled && !body.includeDisabled) {
      outcomes.push({
        keyId: key.id,
        envVarName: key.envVarName,
        label: key.label,
        ok: false,
        status: 0,
        latencyMs: 0,
        skipped: "disabled",
      });
      continue;
    }
    if (isPlaceholderValue(key.value)) {
      outcomes.push({
        keyId: key.id,
        envVarName: key.envVarName,
        label: key.label,
        ok: false,
        status: 0,
        latencyMs: 0,
        skipped: "needs key",
      });
      continue;
    }
    if (!key.endpoint) {
      outcomes.push({
        keyId: key.id,
        envVarName: key.envVarName,
        label: key.label,
        ok: false,
        status: 0,
        latencyMs: 0,
        skipped: "no test URL",
      });
      continue;
    }
    if (body.onlyUntested && key.lastTestedAt) {
      outcomes.push({
        keyId: key.id,
        envVarName: key.envVarName,
        label: key.label,
        ok: key.lastTestStatus !== undefined && key.lastTestStatus >= 200 && key.lastTestStatus < 300,
        status: key.lastTestStatus ?? 0,
        latencyMs: key.lastTestLatencyMs ?? 0,
        skipped: "already tested",
      });
      continue;
    }

    const result = await testApiKey(key);
    const idx = vault.keys.findIndex((k) => k.id === key.id);
    if (idx >= 0) {
      vault.keys[idx] = {
        ...vault.keys[idx],
        lastTestedAt: now,
        lastTestStatus: result.status,
        lastTestLatencyMs: result.latencyMs,
        updatedAt: now,
      };
      vault.history.push(
        historyEntry("test", vault.keys[idx], {
          meta: `bulk: ${result.status} ${result.ok ? "OK" : "FAIL"} ${result.latencyMs}ms`,
        })
      );
    }
    outcomes.push({
      keyId: key.id,
      envVarName: key.envVarName,
      label: key.label,
      ok: result.ok,
      status: result.status,
      latencyMs: result.latencyMs,
    });
  }

  await writeVault(trimHistory(vault));
  const tested = outcomes.filter((o) => !o.skipped);
  res.json({
    outcomes,
    summary: {
      tested: tested.length,
      passed: tested.filter((o) => o.ok).length,
      failed: tested.filter((o) => !o.ok).length,
      skipped: outcomes.filter((o) => o.skipped).length,
    },
    keys: maskKeys(vault.keys),
  });
});

router.post("/rapidapi/test-all", async (_req, res) => {
  const vault = await readVault();
  const rapidKey =
    vault.keys.find((k) => k.envVarName === "VITE_RAPIDAPI_KEY" && !k.disabled && !isPlaceholderValue(k.value)) ??
    vault.keys.find((k) => k.envVarName === "RAPIDAPI_KEY" && !k.disabled && !isPlaceholderValue(k.value));

  if (!rapidKey) {
    res.status(400).json({
      error: "No configured VITE_RAPIDAPI_KEY or RAPIDAPI_KEY in vault. Paste your RapidAPI key first.",
    });
    return;
  }

  const results = await testAllRapidApiHosts(rapidKey.value);
  const passed = results.filter((r) => r.ok).length;
  res.json({
    keyLabel: rapidKey.label,
    envVarName: rapidKey.envVarName,
    summary: { hosts: results.length, passed, failed: results.length - passed },
    results,
  });
});

router.post("/rapidapi/test-full", async (_req, res) => {
  const vault = await readVault();
  const rapidKey =
    vault.keys.find((k) => k.envVarName === "VITE_RAPIDAPI_KEY" && !k.disabled && !isPlaceholderValue(k.value)) ??
    vault.keys.find((k) => k.envVarName === "RAPIDAPI_KEY" && !k.disabled && !isPlaceholderValue(k.value));

  if (!rapidKey) {
    res.status(400).json({
      error: "No configured VITE_RAPIDAPI_KEY or RAPIDAPI_KEY in vault. Paste your RapidAPI key first.",
    });
    return;
  }

  const { results, resolverContext } = await testAllRapidApiEndpoints(rapidKey.value);
  const tested = results.filter((r) => !r.skipped);
  const passed = tested.filter((r) => r.ok).length;
  res.json({
    keyLabel: rapidKey.label,
    envVarName: rapidKey.envVarName,
    resolverContext,
    summary: {
      endpoints: results.length,
      tested: tested.length,
      passed,
      failed: tested.length - passed,
      skipped: results.filter((r) => r.skipped).length,
    },
    results,
  });
});

// ─── History ──────────────────────────────────────────────────────────────────

router.get("/history", async (_req, res) => {
  const vault = await readVault();
  const history = [...vault.history].reverse().slice(0, 100);
  res.json({ history });
});

// ─── Sync targets ─────────────────────────────────────────────────────────────

router.get("/sync-targets", async (_req, res) => {
  const vault = await readVault();
  res.json({ targets: vault.syncTargets });
});

router.post("/sync-targets", async (req, res) => {
  const parsed = SyncTargetCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  if (!existsSync(parsed.data.envFilePath)) {
    res.status(400).json({ error: `File not found: ${parsed.data.envFilePath}` });
    return;
  }

  const vault = await readVault();
  const target: SyncTarget = { id: nanoid(), ...parsed.data };
  vault.syncTargets.push(target);
  await writeVault(vault);
  res.status(201).json({ target });
});

router.put("/sync-targets/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = SyncTargetCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const vault = await readVault();
  const idx = vault.syncTargets.findIndex((t) => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Sync target not found." });
    return;
  }

  vault.syncTargets[idx] = { ...vault.syncTargets[idx], ...parsed.data };
  await writeVault(vault);
  res.json({ target: vault.syncTargets[idx] });
});

router.post("/sync-targets/:id/sync", async (req, res) => {
  const { id } = req.params;
  const vault = await readVault();
  const target = vault.syncTargets.find((t) => t.id === id);
  if (!target) {
    res.status(404).json({ error: "Sync target not found." });
    return;
  }

  const { keysWritten } = await syncToEnvFile(target, vault);

  // Update lastSyncedAt and history after successful sync
  const idx = vault.syncTargets.findIndex((t) => t.id === id);
  vault.syncTargets[idx] = { ...target, lastSyncedAt: new Date().toISOString() };
  vault.history.push({
    id: nanoid(),
    timestamp: new Date().toISOString(),
    action: "sync",
    keyId: "",
    label: `Synced to ${target.name}`,
    envVarName: "",
    meta: `${keysWritten} keys → ${target.envFilePath}`,
  });
  await writeVault(trimHistory(vault));
  res.json({ ok: true, keysWritten, filePath: target.envFilePath });
});

router.delete("/sync-targets/:id", async (req, res) => {
  const { id } = req.params;
  const vault = await readVault();
  const idx = vault.syncTargets.findIndex((t) => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Sync target not found." });
    return;
  }

  vault.syncTargets.splice(idx, 1);
  await writeVault(vault);
  res.json({ ok: true });
});

// ─── Vault export / import / reset ───────────────────────────────────────────

router.get("/vault/export", async (_req, res) => {
  const vault = await readVault();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", 'attachment; filename="vault-export.json"');
  res.send(JSON.stringify(vault, null, 2));
});

router.post("/vault/import", async (req, res) => {
  const body = req.body as unknown;
  if (typeof body !== "object" || body === null || !("keys" in body)) {
    res.status(400).json({ error: "Invalid vault JSON format." });
    return;
  }

  const imported = body as VaultData;
  // Re-encrypt with current master key (writeVault handles this)
  await writeVault(imported, { destructive: true });
  res.json({ ok: true });
});

router.post("/vault/reset", async (req, res) => {
  const parsed = VaultResetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Send { "confirm": "RESET VAULT" } to confirm.' });
    return;
  }

  const vaultPath = fileURLToPath(new URL("../.portal-keys.enc", import.meta.url));
  await deleteKeychainKey();
  evictMasterKeyCache();
  lockSession();

  if (existsSync(vaultPath)) {
    await unlink(vaultPath);
  }

  res.json({ ok: true, message: "Vault and keychain entry deleted." });
});

// ─── Projects: scan existing .env / create new project ───────────────────────

router.get("/projects/catalog", (_req, res) => {
  res.json({ projects: KNOWN_PROJECTS });
});

// POST /api/projects/import-all — pull real keys from every known project file
router.post("/projects/import-all", async (_req, res) => {
  const vault = await readVault();
  const results = await importAllKnownProjects(vault);
  await writeVault(trimHistory(vault));
  const pulled = results.flatMap((r) =>
    r.vars.filter((v) => v.action === "imported" || v.action === "updated")
  ).length;
  res.json({ results, pulled });
});

// POST /api/projects/push-all — write vault keys to every linked app file
router.post("/projects/push-all", async (_req, res) => {
  const vault = await readVault();
  const { syncToEnvFile } = await import("./sync.js");
  const outcomes: Array<{ name: string; ok: boolean; keysWritten?: number; error?: string }> = [];

  for (const target of vault.syncTargets) {
    try {
      const { keysWritten } = await syncToEnvFile(target, vault);
      const idx = vault.syncTargets.findIndex((t) => t.id === target.id);
      vault.syncTargets[idx] = { ...target, lastSyncedAt: new Date().toISOString() };
      outcomes.push({ name: target.name, ok: true, keysWritten });
    } catch (e) {
      outcomes.push({
        name: target.name,
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      });
    }
  }

  await writeVault(trimHistory(vault));
  res.json({ outcomes });
});

async function rescanAllProjects(vault: VaultData): Promise<ProjectScanResult[]> {
  const seen = new Set<string>();
  const jobs: Array<{ name: string; envFilePath: string; rootPath?: string }> = [];

  for (const project of KNOWN_PROJECTS) {
    if (seen.has(project.envFilePath)) continue;
    seen.add(project.envFilePath);
    jobs.push({
      name: project.name,
      envFilePath: project.envFilePath,
      rootPath: project.rootPath,
    });
  }

  for (const target of vault.syncTargets) {
    if (seen.has(target.envFilePath)) continue;
    seen.add(target.envFilePath);
    jobs.push({ name: target.name, envFilePath: target.envFilePath });
  }

  const results: ProjectScanResult[] = [];
  for (const job of jobs) {
    results.push(
      await scanProjectForVault(vault, job.name, job.envFilePath, job.rootPath)
    );
  }
  return results;
}

// POST /api/projects/rescan — detect env vars used in project source code
router.post("/projects/rescan", async (req, res) => {
  const parsed = ProjectRescanSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const vault = await readVault();
  const { targetId, projectName, envFilePath, rootPath } = parsed.data;

  const finishRescan = async (results: ProjectScanResult[]) => {
    const usage = applyScanUsageUpdates(vault, results);
    await writeVault(trimHistory(vault));
    res.json({ results, usage, keys: maskKeys(vault.keys) });
  };

  if (targetId) {
    const target = vault.syncTargets.find((t) => t.id === targetId);
    if (!target) {
      res.status(404).json({ error: "App not found." });
      return;
    }
    const result = await scanProjectForVault(vault, target.name, target.envFilePath);
    await finishRescan([result]);
    return;
  }

  if (envFilePath && projectName) {
    const result = await scanProjectForVault(vault, projectName, envFilePath, rootPath);
    await finishRescan([result]);
    return;
  }

  const results = await rescanAllProjects(vault);
  await finishRescan(results);
});

// POST /api/projects/apply-discovered — add scanned vars to vault + app assignment
router.post("/projects/apply-discovered", async (req, res) => {
  const parsed = ApplyDiscoveredSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const vault = await readVault();
  const { targetId, projectName, envFilePath, varNames, pullValuesFromEnv } = parsed.data;

  if (targetId) {
    const target = vault.syncTargets.find((t) => t.id === targetId);
    if (!target) {
      res.status(404).json({ error: "App not found." });
      return;
    }
  }

  const outcome = await applyDiscoveredVars(vault, projectName, envFilePath, varNames, {
    pullValuesFromEnv: pullValuesFromEnv ?? true,
  });
  const scanResult = await scanProjectForVault(vault, projectName, envFilePath);
  applyScanUsageUpdates(vault, [scanResult]);
  await writeVault(trimHistory(vault));

  res.json({ ...outcome, keys: maskKeys(vault.keys) });
});

// POST /api/projects/scan-env
// Body: { envFilePath: string }
// Returns each var found, whether it already exists in the vault, and (if new)
// the plaintext value so the UI can offer to import it.
router.post("/projects/scan-env", async (req, res) => {
  const { envFilePath } = req.body as { envFilePath?: string };
  if (!envFilePath) {
    res.status(400).json({ error: "envFilePath required." });
    return;
  }

  if (!existsSync(envFilePath)) {
    res.status(404).json({ error: `File not found: ${envFilePath}` });
    return;
  }

  const content = await readFile(envFilePath, "utf8");
  const parsed = parseEnvFile(content);
  const vault = await readVault();

  const vars = parsed.map(({ name, value }) => {
    const existing = vault.keys.find((k) => k.envVarName === name);
    const existingIsPlaceholder = existing
      ? isPlaceholderValue(existing.value)
      : null;
    const canImport =
      !existing || existingIsPlaceholder
        ? !isPlaceholderValue(value)
        : false;
    return {
      name,
      existingKeyId: existing?.id ?? null,
      existingLabel: existing?.label ?? null,
      existingIsPlaceholder,
      fileValue: canImport ? value : null,
      newValue: canImport ? value : null,
    };
  });

  res.json({ vars, filePath: envFilePath });
});

// POST /api/projects/import-env
// Body: { envFilePath, projectName, selectedVarNames: string[] }
// Imports selected vars into the vault as new keys (skips already-existing envVarNames).
// Creates a sync target for the project automatically.
router.post("/projects/import-env", async (req, res) => {
  const { envFilePath, projectName, selectedVarNames } = req.body as {
    envFilePath?: string;
    projectName?: string;
    selectedVarNames?: string[];
  };

  if (!envFilePath || !projectName || !Array.isArray(selectedVarNames)) {
    res.status(400).json({ error: "envFilePath, projectName, and selectedVarNames required." });
    return;
  }

  if (!existsSync(envFilePath)) {
    res.status(404).json({ error: `File not found: ${envFilePath}` });
    return;
  }

  const vault = await readVault();
  const result = await importProjectEnvFile(vault, projectName, envFilePath, {
    varNames: selectedVarNames,
  });
  await writeVault(trimHistory(vault));

  const imported = result.vars.filter(
    (v) => v.action === "imported" || v.action === "updated"
  ).length;
  const skipped = result.vars
    .filter((v) => v.action === "skipped_unchanged" || v.action === "skipped_placeholder")
    .map((v) => v.name);

  res.json({
    ok: true,
    imported,
    skipped,
    targetId: result.targetId,
    vars: result.vars,
  });
});

// POST /api/projects/create
// Body: { projectName, envFilePath, serviceKeyIds: string[] }
// Creates an empty .env.local at envFilePath + registers a sync target.
router.post("/projects/create", async (req, res) => {
  const { projectName, envFilePath, serviceKeyIds } = req.body as {
    projectName?: string;
    envFilePath?: string;
    serviceKeyIds?: string[];
  };

  if (!projectName || !envFilePath) {
    res.status(400).json({ error: "projectName and envFilePath required." });
    return;
  }

  const keyIds: string[] = Array.isArray(serviceKeyIds) ? serviceKeyIds : [];

  // Create .env.local if it doesn't exist
  if (!existsSync(envFilePath)) {
    await mkdir(dirname(envFilePath), { recursive: true });
    const header = `# .env.local — ${projectName}\n# Generated by API Vault Portal\n\n`;
    await writeFile(envFilePath, header, "utf8");
  }

  const vault = await readVault();
  const exists = vault.syncTargets.find((t) => t.name === projectName);
  if (exists) {
    res.status(409).json({ error: `A sync target named "${projectName}" already exists.` });
    return;
  }

  const target = { id: nanoid(), name: projectName, envFilePath, keyIds };
  vault.syncTargets.push(target);
  await writeVault(vault);

  res.status(201).json({ ok: true, target, envCreated: !existsSync(envFilePath) });
});

// ─── Error handler ────────────────────────────────────────────────────────────

router.use(
  (err: unknown, _req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }, _next: unknown) => {
    if (err instanceof VaultNotSetupError) {
      (res as unknown as { status: (n: number) => { json: (b: unknown) => void } })
        .status(403)
        .json({ error: err.message, code: "VAULT_NOT_SETUP" });
      return;
    }
    console.error("[api-vault]", err instanceof Error ? err.message : err);
    (res as unknown as { status: (n: number) => { json: (b: unknown) => void } })
      .status(500)
      .json({ error: "Internal server error." });
  }
);

export default router;
