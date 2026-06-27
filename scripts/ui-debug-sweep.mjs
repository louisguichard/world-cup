/**
 * Screen-by-screen layout scan using ?uidebug=1 and window.__wcUiDebugScan().
 * Writes gap list, run log, and auto-updates ui-debug-dashboard.canvas.tsx.
 *
 * Usage: npm run ui:debug-sweep [-- baseUrl]
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncUiDebugCanvas } from "./sync-ui-debug-canvas.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://127.0.0.1:5173";

const ROUTES = [
  { name: "Live", hash: "#live" },
  { name: "Results", hash: "#results" },
  { name: "Schedule", hash: "#schedule" },
  { name: "Groups", hash: "#groups" },
  { name: "Bracket", hash: "#bracket" },
  { name: "Teams", hash: "#teams" },
  { name: "Tournament", hash: "#tournament" },
  { name: "Simulator", hash: "#simulator" },
];

const VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
];

const logs = [];

function log(line = "") {
  const text = String(line);
  logs.push(text);
  console.log(text);
}

async function waitForApp(page) {
  await page.goto(`${BASE}/?uidebug=1`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const main = document.querySelector(".wc-main");
      const splash = document.querySelector(".splash-screen");
      return main && !main.hasAttribute("inert") && !splash;
    },
    { timeout: 90_000 }
  );
  await page.waitForTimeout(1500);
}

async function scanRoute(page, route) {
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, route.hash);
  await page.waitForTimeout(2000);

  if (route.hash === "#live") {
    await page
      .waitForFunction(() => !document.querySelector(".qual-dashboard-row .dashboard-section-skeleton"), {
        timeout: 15_000,
      })
      .catch(() => {});
    await page.waitForTimeout(500);
  }

  return page.evaluate(() => {
    const scan = window.__wcUiDebugScan;
    if (typeof scan !== "function") {
      return [{ kind: "error", label: "scan-missing", detail: "__wcUiDebugScan not found" }];
    }
    return scan().map((issue) => ({
      kind: issue.kind,
      label: issue.label,
      detail: issue.detail,
    }));
  });
}

async function main() {
  log(`UI debug sweep — base ${BASE}`);
  log(`Started ${new Date().toISOString()}\n`);

  const browser = await chromium.launch({ headless: true });
  const report = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ...devices["Desktop Chrome"],
    });
    const page = await context.newPage();

    try {
      await waitForApp(page);

      for (const route of ROUTES) {
        const issues = await scanRoute(page, route);
        report.push({ viewport: viewport.label, route: route.name, issues });
        const count = issues.length;
        log(`[${viewport.label}] ${route.name}: ${count} issue${count === 1 ? "" : "s"}`);
        for (const issue of issues.slice(0, 8)) {
          log(`  · ${issue.kind} — ${issue.label}: ${issue.detail}`);
        }
        if (issues.length > 8) log(`  · … and ${issues.length - 8} more`);
      }
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const total = report.reduce((n, r) => n + r.issues.length, 0);
  log(`\nTotal issues: ${total} across ${report.length} screen/viewport combos`);

  const payload = { scannedAt: new Date().toISOString(), base: BASE, report };
  const gapPath = path.join(ROOT, ".cursor/ui-debug-gap-list.json");
  const logPath = path.join(ROOT, ".cursor/ui-debug-last-run.log");

  fs.mkdirSync(path.dirname(gapPath), { recursive: true });
  fs.writeFileSync(gapPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(logPath, logs.join("\n"));
  log(`Wrote ${gapPath}`);
  log(`Wrote ${logPath}`);

  syncUiDebugCanvas({ logs: logs.join("\n") });
  log("\nCanvas snapshot updated — reopen ui-debug-dashboard.canvas.tsx if it is already open.");
}

main().catch((err) => {
  log(`\nERROR: ${err instanceof Error ? err.message : String(err)}`);
  fs.writeFileSync(path.join(ROOT, ".cursor/ui-debug-last-run.log"), logs.join("\n"));
  process.exit(1);
});
