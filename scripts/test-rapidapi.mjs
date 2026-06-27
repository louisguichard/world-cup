/**
 * Smoke test — one probe per RapidAPI hub.
 * Run: npm run test:rapidapi
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  loadCatalog,
  loadKeyFromEnvFile,
  runSmokeProbes,
  printSummary,
} from "./lib/rapidapi-probe.mjs";

const { rapidApiKey, zafronixKey } = loadKeyFromEnvFile();
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? process.env.VITE_RAPIDAPI_KEY ?? rapidApiKey;
const ZAFRONIX_KEY = process.env.ZAFRONIX_API_KEY ?? process.env.VITE_ZAFRONIX_API_KEY ?? zafronixKey;

if (!RAPIDAPI_KEY) {
  console.error("No RAPIDAPI_KEY or VITE_RAPIDAPI_KEY set. Add to .env.local and re-run.");
  process.exit(1);
}

const catalog = loadCatalog();
const results = await runSmokeProbes(RAPIDAPI_KEY, catalog, { zafronixKey: ZAFRONIX_KEY });
for (const r of results) process.stdout.write(r.ok || r.skipped ? "." : "F");

const failCount = printSummary(results, "RapidAPI smoke test (1 per hub)");

writeFileSync(
  join(ROOT, "scripts/rapidapi-test-results.json"),
  JSON.stringify({ testedAt: new Date().toISOString(), mode: "smoke", results }, null, 2)
);

process.exit(failCount > 0 ? 1 : 0);
