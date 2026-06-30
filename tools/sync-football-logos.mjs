/**
 * Sync FIFA World Cup 2026 team + tournament logos from football-logos.cc into public/logos/.
 * Run: pnpm logos:sync
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");
const TEAMS_DIR = join(PUBLIC, "logos", "teams");
const TOURNAMENT_DIR = join(PUBLIC, "logos", "tournament");

const COLLECTION_ZIP_URL =
  "https://assets.football-logos.cc/collections/fifa-world-cup-2026.football-logos.cc.zip";

/** CDN URLs scraped from football-logos.cc (content-hashed paths). */
const TOURNAMENT_CDN = {
  official: {
    256: "https://assets.football-logos.cc/logos/tournaments/256x256/fifa-world-cup-2026.7b4f6a98.png",
    512: "https://assets.football-logos.cc/logos/tournaments/512x512/fifa-world-cup-2026.9737ad74.png",
    700: "https://assets.football-logos.cc/logos/tournaments/700x700/fifa-world-cup-2026.7042846f.png",
    1500: "https://assets.football-logos.cc/logos/tournaments/1500x1500/fifa-world-cup-2026.31d2489d.png",
  },
  white: {
    256: "https://assets.football-logos.cc/logos/tournaments/256x256/fifa-world-cup-2026--white.bb78d21f.png",
  },
  unofficial: {
    256: "https://assets.football-logos.cc/logos/tournaments/256x256/fifa-world-cup-2026--unofficial.3fd1861d.png",
  },
};

const TEAM_SIZES = ["64x64", "128x128", "256x256", "512x512"];
const TOURNAMENT_SIZES = [64, 128, 256, 512, 700];

async function download(url, dest) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "road-to-wc-final/4.0 (logo-sync; +https://github.com)",
    },
  });
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} ${url}`);
  }
  mkdirSync(dirname(dest), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function resizeWithSips(src, dest, size) {
  mkdirSync(dirname(dest), { recursive: true });
  execSync(`sips -z ${size} ${size} "${src}" --out "${dest}"`, { stdio: "pipe" });
}

function slugFromZipName(filename) {
  return filename
    .replace(/\.football-logos\.cc\.png$/i, "")
    .replace(/-national-team$/i, "");
}

async function syncTeamLogos() {
  console.log("Downloading WC 2026 team collection ZIP…");
  const zipRes = await fetch(COLLECTION_ZIP_URL);
  if (!zipRes.ok) throw new Error(`ZIP download failed: ${zipRes.status}`);

  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
  const tmpZip = join(ROOT, ".tmp-wc-logos.zip");
  writeFileSync(tmpZip, zipBuffer);

  const tmpExtract = join(ROOT, ".tmp-wc-logos-extract");
  rmSync(tmpExtract, { recursive: true, force: true });
  mkdirSync(tmpExtract, { recursive: true });

  execSync(`unzip -q -o "${tmpZip}" -d "${tmpExtract}"`, { stdio: "pipe" });

  let count = 0;
  for (const sizeFolder of TEAM_SIZES) {
    const srcDir = join(tmpExtract, sizeFolder);
    if (!existsSync(srcDir)) continue;
    const destDir = join(TEAMS_DIR, sizeFolder);
    mkdirSync(destDir, { recursive: true });

    for (const file of execSync(`ls "${srcDir}"`, { encoding: "utf8" }).trim().split("\n")) {
      if (!file.endsWith(".png")) continue;
      const slug = slugFromZipName(file);
      const dest = join(destDir, `${slug}.png`);
      writeFileSync(dest, readFileSync(join(srcDir, file)));
      count += 1;
    }
  }

  rmSync(tmpZip, { force: true });
  rmSync(tmpExtract, { recursive: true, force: true });
  console.log(`Synced ${count} team logo files.`);
}

async function syncTournamentLogos() {
  console.log("Downloading tournament logo variants…");

  for (const [variant, urls] of Object.entries(TOURNAMENT_CDN)) {
    const variantDir = join(TOURNAMENT_DIR, variant);
    mkdirSync(variantDir, { recursive: true });

    const downloaded = new Map();

    for (const [size, url] of Object.entries(urls)) {
      const dest = join(variantDir, `${size}.png`);
      try {
        await download(url, dest);
        downloaded.set(Number(size), dest);
        console.log(`  ${variant} ${size}px`);
      } catch (err) {
        console.warn(`  skip ${variant} ${size}px: ${err instanceof Error ? err.message : err}`);
      }
    }

    const base512 = downloaded.get(512) ?? downloaded.get(256) ?? downloaded.get(700);
    if (!base512) {
      throw new Error(`No base image for tournament variant: ${variant}`);
    }

    for (const size of TOURNAMENT_SIZES) {
      const dest = join(variantDir, `${size}.png`);
      if (existsSync(dest)) continue;
      resizeWithSips(base512, dest, size);
      console.log(`  ${variant} ${size}px (resized)`);
    }
  }
}

function generateAppIcons() {
  const official512 = join(TOURNAMENT_DIR, "official", "512.png");
  if (!existsSync(official512)) {
    throw new Error("Missing official 512px tournament logo");
  }

  const outputs = [
    { src: official512, dest: join(PUBLIC, "favicon-32.png"), size: 32 },
    { src: official512, dest: join(PUBLIC, "favicon-192.png"), size: 192 },
    { src: official512, dest: join(PUBLIC, "icons", "icon-192.png"), size: 192 },
    { src: official512, dest: join(PUBLIC, "icons", "icon-512.png"), size: 512 },
    { src: official512, dest: join(PUBLIC, "apple-touch-icon.png"), size: 180 },
    { src: official512, dest: join(PUBLIC, "og-image.png"), size: 512 },
  ];

  for (const { src, dest, size } of outputs) {
    resizeWithSips(src, dest, size);
    console.log(`Generated ${dest.replace(ROOT, "")}`);
  }
}

async function main() {
  await syncTeamLogos();
  await syncTournamentLogos();
  generateAppIcons();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
