import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { nanoid } from "nanoid";
import { isPlaceholderValue, parseEnvFile } from "./envParse.js";
import { KNOWN_PROJECTS } from "./projectCatalog.js";
import type { ApiKey, SyncTarget, VaultData, VaultHistory } from "./vault.js";
import { hashValue } from "./vault.js";

export type ImportVarResult = {
  name: string;
  action: "imported" | "updated" | "skipped_missing" | "skipped_placeholder" | "skipped_unchanged";
  keyId?: string;
};

export type ImportProjectResult = {
  projectName: string;
  envFilePath: string;
  found: boolean;
  vars: ImportVarResult[];
  targetId?: string;
};

function historyEntry(
  action: VaultHistory["action"],
  key: Pick<ApiKey, "id" | "label" | "envVarName">,
  extra?: Partial<VaultHistory>
): VaultHistory {
  return {
    id: nanoid(),
    timestamp: new Date().toISOString(),
    action,
    keyId: key.id,
    label: key.label,
    envVarName: key.envVarName,
    ...extra,
  };
}

/** Apply one value to every vault key with the same envVarName (shared keys). */
export function propagateEnvVarValue(
  vault: VaultData,
  envVarName: string,
  value: string,
  sourceKeyId: string
): number {
  const now = new Date().toISOString();
  let count = 0;
  for (const k of vault.keys) {
    if (k.envVarName !== envVarName || k.id === sourceKeyId) continue;
    if (k.value === value) continue;
    const oldHash = hashValue(k.value);
    k.value = value;
    k.updatedAt = now;
    vault.history.push(
      historyEntry("update", k, {
        oldValueHash: oldHash,
        newValueHash: hashValue(value),
        meta: `shared value from ${envVarName}`,
      })
    );
    count++;
  }
  return count;
}

function upsertKeyFromEnv(
  vault: VaultData,
  envVarName: string,
  value: string,
  projectName: string,
  envFilePath: string
): { keyId: string; action: "imported" | "updated" | "skipped_unchanged" } {
  const now = new Date().toISOString();
  const existing = vault.keys.find((k) => k.envVarName === envVarName);

  if (existing) {
    if (existing.value === value) {
      return { keyId: existing.id, action: "skipped_unchanged" };
    }
    const oldHash = hashValue(existing.value);
    existing.value = value;
    existing.updatedAt = now;
    vault.history.push(
      historyEntry("update", existing, {
        oldValueHash: oldHash,
        newValueHash: hashValue(value),
        meta: `imported from ${envFilePath}`,
      })
    );
    propagateEnvVarValue(vault, envVarName, value, existing.id);
    return { keyId: existing.id, action: "updated" };
  }

  const newKey: ApiKey = {
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
    serviceGroup: projectName,
    label: `${envVarName} (${projectName})`,
    envVarName,
    value,
    notes: `Imported from ${envFilePath}`,
  };
  vault.keys.push(newKey);
  vault.history.push(
    historyEntry("create", newKey, {
      newValueHash: hashValue(value),
      meta: `imported from ${envFilePath}`,
    })
  );
  return { keyId: newKey.id, action: "imported" };
}

function ensureSyncTarget(
  vault: VaultData,
  projectName: string,
  envFilePath: string,
  keyIds: string[]
): SyncTarget {
  let target = vault.syncTargets.find(
    (t) => t.envFilePath === envFilePath || t.name === projectName
  );
  if (!target) {
    target = { id: nanoid(), name: projectName, envFilePath, keyIds: [] };
    vault.syncTargets.push(target);
  }
  target.name = projectName;
  target.envFilePath = envFilePath;
  const merged = new Set([...target.keyIds, ...keyIds]);
  target.keyIds = [...merged];
  return target;
}

/** Import real values from one project's env file into the vault. */
export async function importProjectEnvFile(
  vault: VaultData,
  projectName: string,
  envFilePath: string,
  options?: { varNames?: string[] }
): Promise<ImportProjectResult> {
  const result: ImportProjectResult = {
    projectName,
    envFilePath,
    found: false,
    vars: [],
  };

  if (!existsSync(envFilePath)) {
    return result;
  }
  result.found = true;

  const content = await readFile(envFilePath, "utf8");
  const parsed = parseEnvFile(content);
  const names = options?.varNames ?? parsed.map((v) => v.name);
  const importedKeyIds: string[] = [];

  for (const varName of names) {
    const found = parsed.find((v) => v.name === varName);
    if (!found) {
      result.vars.push({ name: varName, action: "skipped_missing" });
      continue;
    }
    if (isPlaceholderValue(found.value)) {
      result.vars.push({ name: varName, action: "skipped_placeholder" });
      continue;
    }

    const { keyId, action } = upsertKeyFromEnv(
      vault,
      varName,
      found.value,
      projectName,
      envFilePath
    );
    importedKeyIds.push(keyId);
    result.vars.push({
      name: varName,
      action: action === "skipped_unchanged" ? "skipped_unchanged" : action,
      keyId,
    });
  }

  if (importedKeyIds.length > 0) {
    const target = ensureSyncTarget(vault, projectName, envFilePath, importedKeyIds);
    result.targetId = target.id;
  } else {
    const target = vault.syncTargets.find(
      (t) => t.envFilePath === envFilePath || t.name === projectName
    );
    result.targetId = target?.id;
  }

  return result;
}

export async function importAllKnownProjects(vault: VaultData): Promise<ImportProjectResult[]> {
  const results: ImportProjectResult[] = [];
  for (const project of KNOWN_PROJECTS) {
    results.push(
      await importProjectEnvFile(vault, project.name, project.envFilePath, {
        varNames: project.expectedVars,
      })
    );
  }
  return results;
}
