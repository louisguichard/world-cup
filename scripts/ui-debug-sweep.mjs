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

const MAX_RETRIES = 2;

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
  { label: "ipad", width: 834, height: 1194 },
  { label: "desktop", width: 1280, height: 800 },
];

const logs = [];

function log(line = "") {
  const text = String(line);
  logs.push(text);
  console.log(text);
}

async function waitForLoadingOverlay(page) {
  await page
    .waitForFunction(() => !document.querySelector('[data-loading="true"]'), {
      timeout: 8000,
    })
    .catch(() => {});
}

async function waitForApp(page) {
  await page.goto(`${BASE}/?uidebug=1`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForLoadingOverlay(page);
  await page.waitForFunction(
    () => {
      const main = document.querySelector(".wc-main");
      const splash = document.querySelector(".splash-screen");
      return main && !main.hasAttribute("inert") && !splash;
    },
    { timeout: 90_000 }
  );
  await waitForLoadingOverlay(page);
  await page.waitForTimeout(1500);
  await waitForScanBridge(page);
}

async function waitForScanBridge(page) {
  await page
    .waitForFunction(() => typeof window.__wcUiDebugScan === "function", { timeout: 15_000 })
    .catch(() => {});
}

async function scanRoute(page, route) {
  await page.evaluate((hash) => {
    window.location.hash = hash;
  }, route.hash);
  await page
    .waitForFunction((hash) => window.location.hash === hash, route.hash, { timeout: 3000 })
    .catch(() => {});
  await waitForLoadingOverlay(page);
  await page.waitForTimeout(2000);

  if (route.hash === "#live") {
    await page
      .waitForFunction(() => !document.querySelector(".qual-dashboard-row .dashboard-section-skeleton"), {
        timeout: 15_000,
      })
      .catch(() => {});
    await page.waitForTimeout(500);
  }

  await waitForScanBridge(page);

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

async function scanRouteWithRetry(page, route) {
  let lastIssues;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const issues = await scanRoute(page, route);
      const scanMissing = issues.some((issue) => issue.label === "scan-missing");
      if (!scanMissing) return issues;
      lastIssues = issues;
      if (attempt < MAX_RETRIES) {
        log(`[SWEEP RETRY] ${route.name} attempt ${attempt + 1} (scan bridge missing)`);
        await page.waitForTimeout(1500);
        await waitForScanBridge(page);
      }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        log(`[SWEEP RETRY] ${route.name} attempt ${attempt + 1}`);
        await page.waitForTimeout(1000);
      } else {
        throw err;
      }
    }
  }
  return lastIssues ?? [{ kind: "error", label: "scan-missing", detail: "__wcUiDebugScan not found" }];
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
        let issues;
        try {
          issues = await scanRouteWithRetry(page, route);
        } catch (err) {
          issues = [
            {
              kind: "error",
              label: "scan-failed",
              detail: err instanceof Error ? err.message : String(err),
            },
          ];
        }
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

  const runsDir = path.join(ROOT, ".cursor/ui-debug-runs");
  fs.mkdirSync(runsDir, { recursive: true });
  const runStamp = payload.scannedAt.replace(/[:.]/g, "-");
  const archiveLogPath = path.join(runsDir, `${runStamp}.log`);
  const archiveGapPath = path.join(runsDir, `${runStamp}.json`);
  fs.writeFileSync(archiveLogPath, logs.join("\n"));
  fs.writeFileSync(archiveGapPath, JSON.stringify(payload, null, 2));

  log(`Wrote ${gapPath}`);
  log(`Wrote ${logPath}`);
  log(`Archived ${archiveLogPath}`);

  syncUiDebugCanvas({ logs: logs.join("\n") });
  log("\nCanvas snapshot updated — reopen ui-debug-dashboard.canvas.tsx if it is already open.");
}

main().catch((err) => {
  log(`\nERROR: ${err instanceof Error ? err.message : String(err)}`);
  fs.writeFileSync(path.join(ROOT, ".cursor/ui-debug-last-run.log"), logs.join("\n"));
  process.exit(1);
});
