/**
 * Sync Paninarr sticker catalog + image URLs from hamzamix/Paninarr.
 * Run: npm run sync:paninarr
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/data/generated");
const SEED_PATH = join(ROOT, "scripts/paninarr-catalog-seed.json");

const OVERRIDES_URL =
  "https://raw.githubusercontent.com/hamzamix/Paninarr/main/data/manual-image-overrides.json";
const ATTRIBUTION_URL =
  "https://raw.githubusercontent.com/hamzamix/Paninarr/main/data/player-image-attribution.json";

/** FIFA abbrev → display name (mirrors wc2026TeamCatalog). */
const WC2026_TEAM_NAMES = {
  ALG: "Algeria",
  ARG: "Argentina",
  AUS: "Australia",
  AUT: "Austria",
  BEL: "Belgium",
  BIH: "Bosnia and Herzegovina",
  BRA: "Brazil",
  CAN: "Canada",
  CIV: "Ivory Coast",
  COD: "Congo DR",
  COL: "Colombia",
  CPV: "Cape Verde",
  CRO: "Croatia",
  CUW: "Curaçao",
  CZE: "Czechia",
  ECU: "Ecuador",
  EGY: "Egypt",
  ENG: "England",
  ESP: "Spain",
  FRA: "France",
  GER: "Germany",
  GHA: "Ghana",
  HAI: "Haiti",
  IRN: "Iran",
  IRQ: "Iraq",
  JOR: "Jordan",
  JPN: "Japan",
  KOR: "South Korea",
  KSA: "Saudi Arabia",
  MAR: "Morocco",
  MEX: "Mexico",
  NED: "Netherlands",
  NOR: "Norway",
  NZL: "New Zealand",
  PAN: "Panama",
  PAR: "Paraguay",
  POR: "Portugal",
  QAT: "Qatar",
  RSA: "South Africa",
  SCO: "Scotland",
  SEN: "Senegal",
  SUI: "Switzerland",
  SWE: "Sweden",
  TUN: "Tunisia",
  TUR: "Türkiye",
  URU: "Uruguay",
  USA: "United States",
  UZB: "Uzbekistan",
};

const COUNTRY_ALIASES = {
  "dr congo": "COD",
  "democratic republic of congo": "COD",
  "cabo verde": "CPV",
  "cape verde": "CPV",
  "curacao": "CUW",
  "korea republic": "KOR",
  "cote d ivoire": "CIV",
};

const STADIUM_TO_SLUG = {
  "MetLife Stadium": "new-york-new-jersey",
  "SoFi Stadium": "los-angeles",
  "Azteca Stadium": "mexico-city",
  "BMO Field": "toronto",
  "BC Place": "vancouver",
  "AT&T Stadium": "dallas",
  "Hard Rock Stadium": "miami",
  "Mercedes-Benz Stadium": "atlanta",
  "Gillette Stadium": "boston",
  "Lincoln Financial Field": "philadelphia",
  "GEHA Field at Arrowhead": "kansas-city",
  "Lumen Field": "seattle",
  "Levi's Stadium": "san-francisco-bay-area",
  "NRG Stadium": "houston",
  "Estadio Akron": "guadalajara",
  "Estadio BBVA": "monterrey",
};

const HOST_CITY_TO_SLUG = {
  "New York/New Jersey": "new-york-new-jersey",
  "Los Angeles": "los-angeles",
  "Mexico City": "mexico-city",
  Dallas: "dallas",
  Miami: "miami",
  Atlanta: "atlanta",
  Boston: "boston",
  Philadelphia: "philadelphia",
  "Kansas City": "kansas-city",
  Seattle: "seattle",
  "San Francisco Bay Area": "san-francisco-bay-area",
  Houston: "houston",
  Toronto: "toronto",
  Vancouver: "vancouver",
  Guadalajara: "guadalajara",
  Monterrey: "monterrey",
};

const TROPHY_IDS = {
  "FIFA World Cup Trophy": "world-cup",
  "Golden Ball": "golden-ball",
  "Golden Boot": "golden-boot",
  "Golden Glove": "golden-glove",
};

function normalizeKey(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function countryToTeamId(country) {
  const norm = normalizeKey(country);
  if (COUNTRY_ALIASES[norm]) return COUNTRY_ALIASES[norm].toLowerCase();
  for (const [abbrev, name] of Object.entries(WC2026_TEAM_NAMES)) {
    if (normalizeKey(name) === norm) return abbrev.toLowerCase();
  }
  throw new Error(`Unknown Paninarr country: ${country}`);
}

function stickerId(index) {
  return `S${String(index).padStart(3, "0")}`;
}

function parseStickerIndex(id) {
  return Number.parseInt(id.slice(1), 10);
}

function buildImageRecord(stickerId, overrides, attributionById) {
  const override = overrides[stickerId];
  const attr = attributionById.get(stickerId);
  const imageUrl = override?.url ?? attr?.imageUrl;
  if (!imageUrl) return undefined;
  return {
    imageUrl,
    cropPosition: override?.position,
    credit: attr?.artist,
    licenseShortName: attr?.licenseShortName,
    source: override ? "fifa-or-manual" : attr?.source,
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function main() {
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8"));
  const { teamsData, stadiums, hostCities, legends, trophies } = seed;

  const [overrides, attributionList] = await Promise.all([
    fetchJson(OVERRIDES_URL),
    fetchJson(ATTRIBUTION_URL),
  ]);

  const attributionById = new Map(attributionList.map((row) => [row.stickerId, row]));

  const players = [];
  const managers = [];
  const stadiumRecords = [];
  const hostCityRecords = [];
  const legendRecords = [];
  const trophyRecords = [];
  const teamStickers = {};

  let stickerIndex = 1;

  for (const team of teamsData) {
    const teamId = countryToTeamId(team.country);
    team.players.forEach((playerName, squadIndex) => {
      const id = stickerId(stickerIndex);
      const image = buildImageRecord(id, overrides, attributionById);
      const record = {
        teamId,
        displayName: playerName,
        normalizedName: normalizeKey(playerName),
        squadIndex,
        category: "player",
        ...(image ?? {}),
      };
      players.push(record);
      if (squadIndex === 0 && image?.imageUrl) {
        teamStickers[teamId] = image.imageUrl;
      }
      stickerIndex++;
    });
  }

  for (const s of stadiums) {
    const id = stickerId(stickerIndex);
    const slug = STADIUM_TO_SLUG[s.name];
    if (!slug) throw new Error(`Unmapped stadium: ${s.name}`);
    const image = buildImageRecord(id, overrides, attributionById);
    stadiumRecords.push({
      slug,
      name: s.name,
      category: "stadium",
      ...(image ?? {}),
    });
    stickerIndex++;
  }

  for (const city of hostCities) {
    const id = stickerId(stickerIndex);
    const slug = HOST_CITY_TO_SLUG[city.name];
    if (!slug) throw new Error(`Unmapped host city: ${city.name}`);
    const image = buildImageRecord(id, overrides, attributionById);
    hostCityRecords.push({
      slug,
      name: city.name,
      category: "hostCity",
      ...(image ?? {}),
    });
    stickerIndex++;
  }

  for (const legend of legends) {
    const id = stickerId(stickerIndex);
    const legendId = slugify(legend.name);
    const image = buildImageRecord(id, overrides, attributionById);
    legendRecords.push({
      legendId,
      name: legend.name,
      country: legend.country,
      category: "legend",
      ...(image ?? {}),
    });
    stickerIndex++;
  }

  for (const trophy of trophies) {
    const id = stickerId(stickerIndex);
    const trophyId = TROPHY_IDS[trophy.name];
    if (!trophyId) throw new Error(`Unmapped trophy: ${trophy.name}`);
    const image = buildImageRecord(id, overrides, attributionById);
    trophyRecords.push({
      trophyId,
      name: trophy.name,
      category: "trophy",
      ...(image ?? {}),
    });
    stickerIndex++;
  }

  for (const team of teamsData) {
    const id = stickerId(stickerIndex);
    const teamId = countryToTeamId(team.country);
    const image = buildImageRecord(id, overrides, attributionById);
    managers.push({
      teamId,
      displayName: team.manager,
      normalizedName: normalizeKey(team.manager),
      category: "manager",
      ...(image ?? {}),
    });
    stickerIndex++;
  }

  const expectedTotal = 1248 + 16 + 16 + 24 + 4 + 48;
  if (stickerIndex - 1 !== expectedTotal) {
    throw new Error(`Sticker count mismatch: expected ${expectedTotal}, asynchronous got ${stickerIndex - 1}`);
  }

  const allWithImages = [
    ...players,
    ...managers,
    ...stadiumRecords,
    ...hostCityRecords,
    ...legendRecords,
    ...trophyRecords,
  ];
  const withUrl = allWithImages.filter((r) => r.imageUrl);
  const coverage = withUrl.length / allWithImages.length;
  if (coverage < 0.9) {
    console.warn(`Warning: only ${(coverage * 100).toFixed(1)}% stickers have imageUrl`);
  }

  const playersByTeam = {};
  for (const p of players) {
    if (!playersByTeam[p.teamId]) playersByTeam[p.teamId] = [];
    playersByTeam[p.teamId].push(p);
  }
  for (const teamId of Object.keys(playersByTeam)) {
    if (playersByTeam[teamId].length !== 26) {
      throw new Error(`Team ${teamId} has ${playersByTeam[teamId].length} players, expected 26`);
    }
  }
  if (Object.keys(playersByTeam).length !== 48) {
    throw new Error(`Expected 48 teams, got ${Object.keys(playersByTeam).length}`);
  }
  if (managers.length !== 48) throw new Error(`Expected 48 managers, got ${managers.length}`);
  if (stadiumRecords.length !== 16) throw new Error(`Expected 16 stadiums`);
  if (hostCityRecords.length !== 16) throw new Error(`Expected 16 host cities`);
  if (legendRecords.length !== 24) throw new Error(`Expected 24 legends`);
  if (trophyRecords.length !== 4) throw new Error(`Expected 4 trophies`);

  const syncedAt = new Date().toISOString();
  const catalog = {
    version: 1,
    syncedAt,
    source: "hamzamix/Paninarr",
    players,
    managers,
    stadiums: stadiumRecords,
    hostCities: hostCityRecords,
    legends: legendRecords,
    trophies: trophyRecords,
  };

  const venueImages = {};
  for (const s of stadiumRecords) {
    if (s.imageUrl) {
      venueImages[s.slug] = {
        ...(venueImages[s.slug] ?? {}),
        heroImageUrl: s.imageUrl,
        heroImageCredit: s.licenseShortName
          ? s.licenseShortName.startsWith("CC")
            ? `Wikimedia Commons · ${s.licenseShortName}`
            : s.licenseShortName
          : undefined,
      };
    }
  }
  for (const c of hostCityRecords) {
    if (c.imageUrl) {
      venueImages[c.slug] = {
        ...(venueImages[c.slug] ?? {}),
        cityHeroImageUrl: c.imageUrl,
      };
    }
  }

  const teamStickersOnly = {
    version: 1,
    syncedAt,
    teamStickers,
  };

  const searchIndex = [];
  const pushSearch = (row) => {
    const tokens = normalizeKey(row.label)
      .split(" ")
      .filter((t) => t.length > 1);
    if (row.teamId) tokens.push(row.teamId);
    searchIndex.push({ ...row, tokens });
  };

  for (const p of players) {
    pushSearch({
      id: `${p.teamId}:${p.normalizedName}`,
      type: "player",
      label: p.displayName,
      teamId: p.teamId,
      imageUrl: p.imageUrl,
    });
  }
  for (const m of managers) {
    pushSearch({
      id: `${m.teamId}:manager`,
      type: "manager",
      label: m.displayName,
      teamId: m.teamId,
      imageUrl: m.imageUrl,
    });
  }
  for (const s of stadiumRecords) {
    pushSearch({ id: s.slug, type: "stadium", label: s.name, imageUrl: s.imageUrl });
  }
  for (const c of hostCityRecords) {
    pushSearch({ id: `${c.slug}:city`, type: "hostCity", label: c.name, imageUrl: c.imageUrl });
  }
  for (const l of legendRecords) {
    pushSearch({ id: l.legendId, type: "legend", label: l.name, imageUrl: l.imageUrl });
  }
  for (const t of trophyRecords) {
    pushSearch({ id: t.trophyId, type: "trophy", label: t.name, imageUrl: t.imageUrl });
  }

  const precacheUrls = [
    ...Object.values(teamStickers),
    ...stadiumRecords.map((s) => s.imageUrl).filter(Boolean),
  ];

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "paninarrTeamStickers.json"), `${JSON.stringify(teamStickersOnly, null, 2)}\n`, "utf8");
  writeFileSync(
    join(OUT_DIR, "paninarrVenueHeroes.json"),
    `${JSON.stringify({ version: 1, syncedAt, venues: venueImages }, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(join(OUT_DIR, "paninarrCatalog.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  writeFileSync(
    join(OUT_DIR, "paninarrSearchIndex.json"),
    `${JSON.stringify({ version: 1, syncedAt, entries: searchIndex }, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(
    join(OUT_DIR, "paninarrPrecacheUrls.json"),
    `${JSON.stringify({ version: 1, syncedAt, urls: precacheUrls }, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(
    join(ROOT, "public/paninarr-precache-urls.json"),
    `${JSON.stringify({ version: 1, syncedAt, urls: precacheUrls }, null, 2)}\n`,
    "utf8"
  );

  console.log(
    `Wrote paninarr catalog: ${players.length} players, ${managers.length} managers, ` +
      `${stadiumRecords.length} stadiums, ${hostCityRecords.length} cities, ` +
      `${legendRecords.length} legends, ${trophyRecords.length} trophies ` +
      `(${(coverage * 100).toFixed(1)}% with images)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
