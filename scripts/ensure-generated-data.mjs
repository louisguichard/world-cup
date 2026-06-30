/**
 * Ensure bundled JSON under src/data/generated exists before typecheck/build.
 * Skips network sync when all required artifacts are already present.
 */

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/data/generated");

const REQUIRED = [
  "paninarrCatalog.json",
  "paninarrSearchIndex.json",
  "paninarrTeamStickers.json",
  "paninarrVenueHeroes.json",
  "playerDatabase.json",
  "kampMatches.json",
];

const missing = REQUIRED.filter((file) => !existsSync(join(OUT_DIR, file)));

if (missing.length === 0) {
  console.log("Generated data present — skipping sync");
  process.exit(0);
}

console.log(`Missing generated data (${missing.length}): ${missing.join(", ")}`);
const scripts = [
  "scripts/sync-paninarr-assets.mjs",
  "scripts/sync-player-database.mjs",
  "scripts/sync-kamp-matches.mjs",
];
for (const script of scripts) {
  execSync(`node ${join(ROOT, script)}`, { stdio: "inherit", cwd: ROOT, env: { ...process.env } });
}
