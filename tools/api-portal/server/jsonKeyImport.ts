import { nanoid } from "nanoid";
import { isPlaceholderValue } from "./envParse.js";
import { propagateEnvVarValue } from "./envImport.js";
import { hashValue } from "./vault.js";
import type { ApiKey, VaultData } from "./vault.js";

export type JsonImportEntry = {
  envVarName: string;
  label: string;
  serviceGroup: string;
  value: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  testHeaders?: Record<string, string>;
  notes?: string;
};

export function importJsonEntries(
  vault: VaultData,
  entries: JsonImportEntry[]
): { added: number; updated: number; keyIds: string[] } {
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  const keyIds: string[] = [];

  for (const entry of entries) {
    if (!entry.value?.trim() || isPlaceholderValue(entry.value)) continue;

    const existing = vault.keys.find((k) => k.envVarName === entry.envVarName);
    if (existing) {
      if (existing.value !== entry.value) {
        const oldHash = hashValue(existing.value);
        existing.value = entry.value;
        existing.label = entry.label;
        existing.serviceGroup = entry.serviceGroup;
        if (entry.endpoint) existing.endpoint = entry.endpoint;
        if (entry.testMethod) existing.testMethod = entry.testMethod;
        if (entry.testHeaders) existing.testHeaders = entry.testHeaders;
        if (entry.notes) existing.notes = entry.notes;
        existing.updatedAt = now;
        propagateEnvVarValue(vault, entry.envVarName, entry.value, existing.id);
        vault.history.push({
          id: nanoid(),
          timestamp: now,
          action: "update",
          keyId: existing.id,
          label: existing.label,
          envVarName: existing.envVarName,
          oldValueHash: oldHash,
          newValueHash: hashValue(entry.value),
          meta: "imported from JSON paste",
        });
        updated++;
      }
      keyIds.push(existing.id);
      continue;
    }

    const newKey: ApiKey = {
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      serviceGroup: entry.serviceGroup,
      label: entry.label,
      envVarName: entry.envVarName,
      value: entry.value,
      endpoint: entry.endpoint,
      testMethod: entry.testMethod,
      testHeaders: entry.testHeaders,
      notes: entry.notes,
    };
    vault.keys.push(newKey);
    vault.history.push({
      id: nanoid(),
      timestamp: now,
      action: "create",
      keyId: newKey.id,
      label: newKey.label,
      envVarName: newKey.envVarName,
      newValueHash: hashValue(newKey.value),
      meta: "imported from JSON paste",
    });
    keyIds.push(newKey.id);
    added++;
  }

  return { added, updated, keyIds };
}
