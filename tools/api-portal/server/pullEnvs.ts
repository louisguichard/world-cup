/**
 * Pull API keys from all known project .env files into the encrypted vault.
 * Does NOT write secrets to git — reads local .env.local files only.
 *
 *   npm run pull-envs
 */

import { isKeychainSetup } from "./keychain.js";
import { readVault, writeVault, isVaultFilePresent } from "./vault.js";
import { importAllKnownProjects } from "./envImport.js";
import { syncToEnvFile } from "./sync.js";

async function main(): Promise<void> {
  if (!(await isKeychainSetup())) {
    console.error("\n⚠  Complete portal setup at http://localhost:4243 first.\n");
    process.exit(1);
  }

  if (!isVaultFilePresent()) {
    console.error("\n⚠  Vault file missing. Run npm run seed first.\n");
    process.exit(1);
  }

  const vault = await readVault();
  const results = await importAllKnownProjects(vault);

  let pulled = 0;
  let placeholders = 0;
  let missingFiles = 0;

  console.log("\n── Pull from project .env files ──\n");
  for (const r of results) {
    if (!r.found) {
      missingFiles++;
      console.log(`  ⊘ ${r.projectName}: file not found\n     ${r.envFilePath}`);
      continue;
    }
    const updated = r.vars.filter((v) => v.action === "imported" || v.action === "updated");
    const empty = r.vars.filter((v) => v.action === "skipped_placeholder");
    pulled += updated.length;
    placeholders += empty.length;
    console.log(`  ${r.projectName}:`);
    for (const v of r.vars) {
      const icon =
        v.action === "imported" || v.action === "updated"
          ? "✓"
          : v.action === "skipped_placeholder"
            ? "○"
            : "·";
      console.log(`    ${icon} ${v.name} — ${v.action}`);
    }
  }

  await writeVault(vault);

  console.log(`\n  Pulled ${pulled} real key(s). ${placeholders} still empty in project files.`);

  if (pulled > 0) {
    console.log("\n── Push vault → project files ──\n");
    for (const target of vault.syncTargets) {
      try {
        const { keysWritten } = await syncToEnvFile(target, vault);
        console.log(`  ✓ ${target.name}: wrote ${keysWritten} keys`);
      } catch (e) {
        console.error(`  ✗ ${target.name}:`, e instanceof Error ? e.message : e);
      }
    }
    await writeVault(vault);
  }

  if (pulled === 0) {
    console.log(
      "\n  No real keys found on disk yet. Paste keys once in the portal (My Secret Keys),\n" +
        "  then click “Send keys to my apps” — that updates every linked project.\n"
    );
  }

  console.log("");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
