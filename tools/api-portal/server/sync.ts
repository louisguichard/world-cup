import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { SyncTarget, VaultData } from "./vault.js";
import { assertEnvFileIsGitignored } from "./gitignoreCheck.js";

// ─── Core sync function ───────────────────────────────────────────────────────

export async function syncToEnvFile(
  target: SyncTarget,
  vault: VaultData
): Promise<{ keysWritten: number }> {
  await assertEnvFileIsGitignored(target.envFilePath);

  // Build map: envVarName → value for the keys in this target
  const toWrite = new Map<string, string>();
  for (const keyId of target.keyIds) {
    const apiKey = vault.keys.find((k) => k.id === keyId);
    if (apiKey) {
      toWrite.set(apiKey.envVarName, apiKey.value);
    }
  }

  // Read existing env file (may not exist yet)
  let existingLines: string[] = [];
  if (existsSync(target.envFilePath)) {
    const content = await readFile(target.envFilePath, "utf8");
    existingLines = content.split("\n");
  }

  // Build the updated env file:
  // - REPLACE lines where KEY= matches a toWrite entry
  // - PRESERVE all other lines (including comments, blank lines, other keys)
  // - ADD new lines for keys not yet present
  const handledVars = new Set<string>();

  const updatedLines = existingLines.map((line) => {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (match) {
      const varName = match[1];
      if (toWrite.has(varName)) {
        handledVars.add(varName);
        return `${varName}=${toWrite.get(varName)!}`;
      }
    }
    return line;
  });

  // Append vars that weren't already in the file
  for (const [varName, value] of toWrite.entries()) {
    if (!handledVars.has(varName)) {
      updatedLines.push(`${varName}=${value}`);
    }
  }

  // Ensure file ends with a single newline
  const result = updatedLines.join("\n").trimEnd() + "\n";
  await writeFile(target.envFilePath, result, "utf8");

  return { keysWritten: toWrite.size };
}

// ─── CLI entry ────────────────────────────────────────────────────────────────

async function runSync(targetName?: string): Promise<void> {
  // Lazy imports so the module can be imported by the server without side effects
  const { readVault, writeVault } = await import("./vault.js");
  const { nanoid } = await import("nanoid");

  const vault = await readVault();

  const targets = targetName
    ? vault.syncTargets.filter((t) => t.name === targetName)
    : vault.syncTargets;

  if (targets.length === 0) {
    const msg = targetName
      ? `No sync target named "${targetName}" found.`
      : "No sync targets configured.";
    console.error(msg);
    process.exit(1);
  }

  let anyFailed = false;
  for (const target of targets) {
    try {
      const { keysWritten } = await syncToEnvFile(target, vault);
      const idx = vault.syncTargets.findIndex((t) => t.id === target.id);
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
      console.log(`[sync] ${target.name}: wrote ${keysWritten} keys to ${target.envFilePath}`);
    } catch (err) {
      console.error(
        `[sync] ${target.name}: FAILED —`,
        err instanceof Error ? err.message : err
      );
      anyFailed = true;
    }
  }

  await writeVault(vault);

  if (anyFailed) process.exit(1);
}

// Run when executed directly: tsx server/sync.ts [target-name]
const thisFile = fileURLToPath(import.meta.url);
const argv1 = process.argv[1] ? fileURLToPath(new URL(process.argv[1], `file://${process.cwd()}/`)) : "";
if (argv1 === thisFile || process.argv[1] === thisFile) {
  const targetName = process.argv[2];
  runSync(targetName).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
