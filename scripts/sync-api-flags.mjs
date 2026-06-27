/**
 * Refresh src/config/apiFlags.ts audit metadata from RapidAPI test results.
 * Run: npm run test:rapidapi:full && npm run sync:api-flags
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_PATH = join(ROOT, "scripts/rapidapi-full-test-results.json");
const FLAGS_PATH = join(ROOT, "src/config/apiFlags.ts");

const PROVIDER_TO_FLAG = {
  footballData: "footballDataApi",
  sportApi7: "sportApi7",
  wc2026Teams: "wc2026Teams",
  wc2026Live: "wc2026Live",
  zafronix: "zafronix",
  oddsIntelligence: "oddsIntelligence",
  footballPrediction: "footballPrediction",
  todayFootballPrediction: "todayFootballPrediction",
  openWeather: "openWeather",
};

function main() {
  if (!existsSync(RESULTS_PATH)) {
    console.error("Missing results — run: npm run test:rapidapi:full");
    process.exit(1);
  }

  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
  const byProvider = new Map();

  for (const row of results.results ?? []) {
    if (!byProvider.has(row.providerId)) {
      byProvider.set(row.providerId, []);
    }
    byProvider.get(row.providerId).push(row);
  }

  let flagsSource = readFileSync(FLAGS_PATH, "utf8");
  const auditDate = (results.testedAt ?? new Date().toISOString()).slice(0, 10);

  flagsSource = flagsSource.replace(
    /Last audited: \d{4}-\d{2}-\d{2} via .+/,
    `Last audited: ${auditDate} via \`npm run test:rapidapi:full\``
  );

  for (const [providerId, flagId] of Object.entries(PROVIDER_TO_FLAG)) {
    const rows = byProvider.get(providerId) ?? [];
    const tested = rows.filter((r) => !r.skipped);
    const passed = tested.filter((r) => r.ok);
    const avgMs =
      tested.length > 0
        ? Math.round(tested.reduce((sum, r) => sum + (r.ms ?? 0), 0) / tested.length)
        : 0;

    const lastAudit = tested.length === 0 ? "untested" : passed.length === tested.length ? "pass" : "fail";
    const enabled = lastAudit !== "fail";

    const blockRegex = new RegExp(
      `(\\s${flagId}:\\s*\\{[^}]*lastAudit:\\s*)"[^"]+"`,
      "s"
    );
    if (blockRegex.test(flagsSource)) {
      flagsSource = flagsSource.replace(blockRegex, `$1"${lastAudit}"`);
    }

    const latencyRegex = new RegExp(`(\\s${flagId}:\\s*\\{[\\s\\S]*?lastLatencyMs:\\s*)\\d+`);
    flagsSource = flagsSource.replace(latencyRegex, `$1${avgMs}`);

    const enabledRegex = new RegExp(`(\\s${flagId}:\\s*\\{[\\s\\S]*?enabled:\\s*)(true|false)`);
    flagsSource = flagsSource.replace(enabledRegex, `$1${enabled}`);
  }

  writeFileSync(FLAGS_PATH, flagsSource);
  console.log(`Updated ${FLAGS_PATH} from ${RESULTS_PATH}`);
}

main();
