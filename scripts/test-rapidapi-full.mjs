/**
 * Full matrix — every endpoint path used by RapidAPI clients.
 * Run: npm run test:rapidapi:full
 *      npm run test:rapidapi:full -- --proxy   (requires npm run dev on :5173)
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  loadCatalog,
  loadKeyFromEnvFile,
  runFullProbes,
  printSummary,
} from "./lib/rapidapi-probe.mjs";

const args = process.argv.slice(2);
const useProxy = args.includes("--proxy");
const aggressive = args.includes("--aggressive");
const { rapidApiKey, zafronixKey } = loadKeyFromEnvFile();
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? process.env.VITE_RAPIDAPI_KEY ?? rapidApiKey;
const ZAFRONIX_KEY = process.env.ZAFRONIX_API_KEY ?? process.env.VITE_ZAFRONIX_API_KEY ?? zafronixKey;

if (!RAPIDAPI_KEY) {
  console.error("No RAPIDAPI_KEY or VITE_RAPIDAPI_KEY set. Add to .env.local and re-run.");
  process.exit(1);
}

if (useProxy) {
  console.log("Proxy mode — ensure Vite dev server is running at http://127.0.0.1:5173\n");
}

const catalog = loadCatalog();
const endpointCount = catalog.reduce((n, p) => n + (p.endpoints?.length ?? 0), 0);
const maxCalls = aggressive ? Number.POSITIVE_INFINITY : 40;
const modeLabel = aggressive ? "full" : `conservative cap (${maxCalls} calls)`;
console.log(`Probing ${endpointCount} endpoints across ${catalog.length} RapidAPI hubs (${useProxy ? "proxy" : "direct"}, ${modeLabel})…\n`);
if (!aggressive) {
  console.log("Tip: add --aggressive to force full endpoint matrix when you intentionally want high API usage.\n");
}

const { results, ctx, truncated } = await runFullProbes(RAPIDAPI_KEY, catalog, {
  mode: useProxy ? "proxy" : "direct",
  zafronixKey: ZAFRONIX_KEY,
  maxCalls,
  conservativeResolver: !aggressive,
});

for (const r of results) process.stdout.write(r.skipped ? "s" : r.ok ? "." : "F");

const failCount = printSummary(results, `RapidAPI full endpoint matrix (${useProxy ? "proxy" : "direct"})`);

writeFileSync(
  join(ROOT, "scripts/rapidapi-full-test-results.json"),
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      mode: useProxy ? "proxy" : "direct",
      resolverContext: ctx,
      truncated,
      aggressive,
      summary: {
        total: results.length,
        passed: results.filter((r) => !r.skipped && r.ok).length,
        failed: results.filter((r) => !r.skipped && !r.ok).length,
        skipped: results.filter((r) => r.skipped).length,
      },
      results,
    },
    null,
    2
  )
);

process.exit(failCount > 0 ? 1 : 0);
