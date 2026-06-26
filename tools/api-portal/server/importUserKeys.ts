/**
 * One-time import of API keys from .portal-key-import.local.json (gitignored).
 * Usage: tsx server/importUserKeys.ts
 * Deletes the import file after success.
 */

import { existsSync, unlinkSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { isKeychainSetup } from "./keychain.js";
import { readVault, writeVault, hashValue, isVaultFilePresent } from "./vault.js";
import { isPlaceholderValue } from "./envParse.js";
import { propagateEnvVarValue } from "./envImport.js";
import type { ApiKey } from "./vault.js";

const IMPORT_PATH = fileURLToPath(new URL("../.portal-key-import.local.json", import.meta.url));

type ImportEntry = {
  envVarName: string;
  label: string;
  serviceGroup: string;
  value: string;
  endpoint?: string;
  testMethod?: "GET" | "POST";
  notes?: string;
};

async function main(): Promise<void> {
  if (!(await isKeychainSetup())) {
    console.error("Vault not set up. Open http://localhost:4243 first.");
    process.exit(1);
  }
  if (!existsSync(IMPORT_PATH)) {
    console.error(`Missing ${IMPORT_PATH}`);
    process.exit(1);
  }

  const entries = JSON.parse(await readFile(IMPORT_PATH, "utf8")) as ImportEntry[];
  const vault = await readVault();
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;

  for (const entry of entries) {
    if (!entry.value?.trim() || isPlaceholderValue(entry.value)) continue;

    const existing = vault.keys.find((k) => k.envVarName === entry.envVarName);
    if (existing) {
      if (existing.value !== entry.value) {
        existing.value = entry.value;
        existing.label = entry.label;
        existing.serviceGroup = entry.serviceGroup;
        if (entry.endpoint) existing.endpoint = entry.endpoint;
        if (entry.testMethod) existing.testMethod = entry.testMethod;
        if (entry.notes) existing.notes = entry.notes;
        existing.updatedAt = now;
        propagateEnvVarValue(vault, entry.envVarName, entry.value, existing.id);
        updated++;
        console.log(`  ✓ updated ${entry.envVarName}`);
      } else {
        console.log(`  · unchanged ${entry.envVarName}`);
      }
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
      meta: "importUserKeys",
    });
    added++;
    console.log(`  + added ${entry.envVarName}`);
  }

  // Link GEMINI_API_KEY to Memo if present
  const gemini = vault.keys.find((k) => k.envVarName === "GEMINI_API_KEY" && !isPlaceholderValue(k.value));
  const memo = vault.syncTargets.find((t) => t.name === "Memo");
  if (gemini && memo && !memo.keyIds.includes(gemini.id)) {
    memo.keyIds.push(gemini.id);
    console.log("  ↻ linked GEMINI_API_KEY → Memo");
  }

  await writeVault(vault);
  unlinkSync(IMPORT_PATH);
  console.log(`\nDone: ${added} added, ${updated} updated. Import file deleted.\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
