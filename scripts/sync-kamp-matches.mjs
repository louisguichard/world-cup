/**
 * Sync bundled kamp matches snapshot from andrekamp/world-cup-26-teams.
 * Run: npm run sync:kamp-matches
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/data/generated");
const OUT_PATH = join(OUT_DIR, "kampMatches.json");

const SOURCE_URL =
  "https://raw.githubusercontent.com/andrekamp/world-cup-26-teams/main/public/matches.json";

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch kamp matches: ${res.status}`);
  }
  const data = await res.json();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  const days = Array.isArray(data) ? data.length : 0;
  const matches = Array.isArray(data)
    ? data.reduce((n, d) => n + (Array.isArray(d.matches) ? d.matches.length : 0), 0)
    : 0;
  console.log(`Wrote ${OUT_PATH} (${days} days, ${matches} matches)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
