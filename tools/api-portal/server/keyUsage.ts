import type { ApiKey, VaultData } from "./vault.js";
import type { ProjectScanResult } from "./projectScan.js";

export type ScanUsageUpdate = {
  disabled: string[];
  reenabled: string[];
  partialMissing: string[];
};

/** After a source scan, label keys missing from projects and auto-disable when unused everywhere. */
export function applyScanUsageUpdates(
  vault: VaultData,
  results: ProjectScanResult[]
): ScanUsageUpdate {
  const update: ScanUsageUpdate = { disabled: [], reenabled: [], partialMissing: [] };
  if (results.length === 0) return update;

  const scannedProjects = new Set(results.map((r) => r.projectName));
  const foundInProject = new Map<string, Set<string>>();

  for (const result of results) {
    for (const d of result.discovered) {
      const set = foundInProject.get(d.name) ?? new Set<string>();
      set.add(result.projectName);
      foundInProject.set(d.name, set);
    }
  }

  const assignedProjects = new Map<string, Set<string>>();
  for (const target of vault.syncTargets) {
    for (const keyId of target.keyIds) {
      const set = assignedProjects.get(keyId) ?? new Set<string>();
      set.add(target.name);
      assignedProjects.set(keyId, set);
    }
  }

  const now = new Date().toISOString();

  for (const key of vault.keys) {
    const assigned = assignedProjects.get(key.id);
    if (!assigned || assigned.size === 0) {
      continue;
    }

    const missingFrom: string[] = [];
    for (const projectName of assigned) {
      if (!scannedProjects.has(projectName)) continue;
      const found = foundInProject.get(key.envVarName)?.has(projectName);
      if (!found) missingFrom.push(projectName);
    }

    key.missingFromProjects = missingFrom.length > 0 ? missingFrom : undefined;

    const allAssignedScanned = [...assigned].every((p) => scannedProjects.has(p));
    const missingEverywhere =
      allAssignedScanned && missingFrom.length === assigned.size && assigned.size > 0;

    if (missingEverywhere) {
      if (!key.disabled) {
        key.disabled = true;
        key.disabledReason = `Not found in code for: ${[...assigned].join(", ")}`;
        key.disabledAt = now;
        update.disabled.push(key.envVarName);
      }
      continue;
    }

    if (missingFrom.length > 0) {
      update.partialMissing.push(key.envVarName);
      if (key.disabled && key.disabledReason?.startsWith("Not found in code")) {
        key.disabled = false;
        key.disabledReason = undefined;
        key.disabledAt = undefined;
        update.reenabled.push(key.envVarName);
      }
      continue;
    }

    if (key.disabled && key.disabledReason?.startsWith("Not found in code")) {
      key.disabled = false;
      key.disabledReason = undefined;
      key.disabledAt = undefined;
      key.missingFromProjects = undefined;
      update.reenabled.push(key.envVarName);
    } else if (missingFrom.length === 0) {
      key.missingFromProjects = undefined;
    }
  }

  return update;
}

export function staleKeysForTarget(
  vault: VaultData,
  targetId: string,
  discoveredNames: Set<string>
): ApiKey[] {
  const target = vault.syncTargets.find((t) => t.id === targetId);
  if (!target) return [];

  return target.keyIds
    .map((id) => vault.keys.find((k) => k.id === id))
    .filter((k): k is ApiKey => Boolean(k))
    .filter((k) => !discoveredNames.has(k.envVarName));
}
