/** Validates team logo override URLs (run: node tools/validate-team-logos.mjs) */
import { TEAM_LOGO_OVERRIDES } from "../src/data/teamLogoOverrides.ts";

const entries = Object.entries(TEAM_LOGO_OVERRIDES);
let failed = 0;

for (const [abbrev, url] of entries) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    const ok = res.ok;
    console.log(`${ok ? "OK" : "FAIL"} ${abbrev} ${res.status} ${url}`);
    if (!ok) failed += 1;
  } catch (err) {
    console.log(`FAIL ${abbrev} ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
  await new Promise((r) => setTimeout(r, 120));
}

console.log(`\n${entries.length - failed}/${entries.length} passed`);
process.exit(failed > 0 ? 1 : 0);
