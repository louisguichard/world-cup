/** Validates self-hosted team logo files (run: pnpm logos:validate) */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FOOTBALL_LOGO_SLUGS } from "../src/data/footballLogoSlugs.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

const TEAM_SIZES = ["64x64", "128x128", "256x256", "512x512"];
const TOURNAMENT_VARIANTS = ["official", "white", "unofficial"];
const TOURNAMENT_SIZES = [64, 128, 256, 512, 700];

let failed = 0;

for (const [abbrev, slug] of Object.entries(FOOTBALL_LOGO_SLUGS)) {
  let teamOk = true;
  for (const size of TEAM_SIZES) {
    const path = join(PUBLIC, "logos", "teams", size, `${slug}.png`);
    if (!existsSync(path)) {
      console.log(`FAIL ${abbrev} missing ${path.replace(ROOT, "")}`);
      failed += 1;
      teamOk = false;
    }
  }
  if (teamOk) console.log(`OK ${abbrev} ${slug}`);
}

for (const variant of TOURNAMENT_VARIANTS) {
  for (const size of TOURNAMENT_SIZES) {
    const path = join(PUBLIC, "logos", "tournament", variant, `${size}.png`);
    if (!existsSync(path)) {
      console.log(`FAIL tournament ${variant} ${size}px`);
      failed += 1;
    }
  }
}

const expected =
  Object.keys(FOOTBALL_LOGO_SLUGS).length * TEAM_SIZES.length +
  TOURNAMENT_VARIANTS.length * TOURNAMENT_SIZES.length;
const passed = expected - failed;
console.log(`\n${passed}/${expected} passed`);
process.exit(failed > 0 ? 1 : 0);
