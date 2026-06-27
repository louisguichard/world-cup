/**
 * Screen-by-screen layout scan using ?uidebug=1 and window.__wcUiDebugScan().
 * Usage: node scripts/ui-debug-sweep.mjs [baseUrl]
 */
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://127.0.0.1:5173";

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

async function waitForApp(page) {
  await page.goto(`${BASE}/?uidebug=1`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () => {
      const main = document.querySelector(".wc-main");
      return main && !main.hasAttribute("inert");
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

  const issues = await page.evaluate(() => {
    const scan = window.__wcUiDebugScan;
    if (typeof scan !== "function") return [{ kind: "error", label: "scan-missing", detail: "__wcUiDebugScan not found" }];
    return scan().map((issue) => ({
      kind: issue.kind,
      label: issue.label,
      detail: issue.detail,
    }));
  });

  return issues;
}

async function main() {
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
        console.log(`[${viewport.label}] ${route.name}: ${count} issue${count === 1 ? "" : "s"}`);
        for (const issue of issues.slice(0, 8)) {
          console.log(`  · ${issue.kind} — ${issue.label}: ${issue.detail}`);
        }
        if (issues.length > 8) console.log(`  · … and ${issues.length - 8} more`);
      }
    } finally {
      await context.close();
    }
  }

  await browser.close();

  const total = report.reduce((n, r) => n + r.issues.length, 0);
  console.log(`\nTotal issues: ${total} across ${report.length} screen/viewport combos`);

  const outPath = new URL("../.cursor/ui-debug-gap-list.json", import.meta.url);
  const fs = await import("node:fs");
  fs.writeFileSync(outPath, JSON.stringify({ scannedAt: new Date().toISOString(), base: BASE, report }, null, 2));
  console.log(`Wrote ${outPath.pathname}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
