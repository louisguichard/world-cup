import type { GroupLetter, Team } from "../types";
import { TEAM_LOGO_OVERRIDES } from "./teamLogoOverrides";

/** FIFA abbrev → display name for all 48 WC 2026 nations. */
export const WC2026_TEAM_NAMES: Record<string, string> = {
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

/** Normalized name / alias → FIFA abbrev. */
export const TEAM_NAME_TO_ABBREV: Record<string, string> = {
  algeria: "ALG",
  argentina: "ARG",
  australia: "AUS",
  austria: "AUT",
  belgium: "BEL",
  bosnia: "BIH",
  "bosnia and herzegovina": "BIH",
  brazil: "BRA",
  canada: "CAN",
  "ivory coast": "CIV",
  "cote d ivoire": "CIV",
  "congo dr": "COD",
  "dr congo": "COD",
  "democratic republic of congo": "COD",
  colombia: "COL",
  "cape verde": "CPV",
  "cabo verde": "CPV",
  croatia: "CRO",
  curacao: "CUW",
  curaçao: "CUW",
  czechia: "CZE",
  "czech republic": "CZE",
  ecuador: "ECU",
  egypt: "EGY",
  england: "ENG",
  spain: "ESP",
  france: "FRA",
  germany: "GER",
  ghana: "GHA",
  haiti: "HAI",
  iran: "IRN",
  iraq: "IRQ",
  jordan: "JOR",
  japan: "JPN",
  "south korea": "KOR",
  "korea republic": "KOR",
  "saudi arabia": "KSA",
  morocco: "MAR",
  mexico: "MEX",
  mex: "MEX",
  netherlands: "NED",
  holland: "NED",
  norway: "NOR",
  "new zealand": "NZL",
  panama: "PAN",
  paraguay: "PAR",
  portugal: "POR",
  qatar: "QAT",
  "south africa": "RSA",
  scotland: "SCO",
  senegal: "SEN",
  switzerland: "SUI",
  sweden: "SWE",
  tunisia: "TUN",
  turkiye: "TUR",
  turkey: "TUR",
  türkiye: "TUR",
  uruguay: "URU",
  "united states": "USA",
  usa: "USA",
  usmnt: "USA",
  uzbekistan: "UZB",
};

function normalizeHint(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve FIFA abbrev from team id, abbrev, or country name. */
export function resolveTeamAbbrevFromHint(hint: string | undefined | null): string | undefined {
  if (!hint) return undefined;
  const raw = hint.trim();
  if (!raw) return undefined;

  const upper = raw.toUpperCase();
  if (WC2026_TEAM_NAMES[upper]) return upper;
  if (TEAM_LOGO_OVERRIDES[upper]) return upper;

  const normalized = normalizeHint(raw);
  if (TEAM_NAME_TO_ABBREV[normalized]) return TEAM_NAME_TO_ABBREV[normalized];

  for (const [name, abbrev] of Object.entries(TEAM_NAME_TO_ABBREV)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return abbrev;
    }
  }

  return undefined;
}

export function resolveTeamLogoByAbbrev(abbrev: string | undefined | null): string | undefined {
  if (!abbrev) return undefined;
  const key = abbrev.toUpperCase();
  return TEAM_LOGO_OVERRIDES[key];
}

export function resolveTeamLogoFromHint(hint: string | undefined | null): string | undefined {
  const abbrev = resolveTeamAbbrevFromHint(hint);
  return abbrev ? resolveTeamLogoByAbbrev(abbrev) : undefined;
}

export function buildCatalogTeam(abbrev: string, group: GroupLetter = "A"): Team {
  const key = abbrev.toUpperCase();
  const name = WC2026_TEAM_NAMES[key] ?? key;
  return {
    id: key.toLowerCase(),
    name,
    shortName: key,
    abbreviation: key,
    group,
    logo: TEAM_LOGO_OVERRIDES[key] ?? "",
    rating: 1375,
  };
}

/** All 48 nations keyed by canonical lowercase id (e.g. mex, usa). */
export function buildWc2026TeamCatalog(): Record<string, Team> {
  const catalog: Record<string, Team> = {};
  for (const abbrev of Object.keys(TEAM_LOGO_OVERRIDES)) {
    const team = buildCatalogTeam(abbrev);
    catalog[team.id] = team;
  }
  return catalog;
}

/** Merge API team onto catalog — keeps upstream id but fixes abbrev + crest. */
export function mergeTeamWithCatalog(team: Team): Team {
  const abbrev =
    resolveTeamAbbrevFromHint(team.abbreviation) ??
    resolveTeamAbbrevFromHint(team.name) ??
    resolveTeamAbbrevFromHint(team.shortName) ??
    resolveTeamAbbrevFromHint(team.id);

  if (!abbrev) return team;

  const catalog = buildCatalogTeam(abbrev, team.group);
  const logo = TEAM_LOGO_OVERRIDES[abbrev] ?? team.logo;

  return {
    ...team,
    abbreviation: abbrev,
    name: team.name || catalog.name,
    shortName: team.shortName || catalog.shortName,
    logo: logo ?? team.logo ?? "",
  };
}

export function resolveCatalogTeamIdByName(name: string): string | undefined {
  const abbrev = resolveTeamAbbrevFromHint(name);
  return abbrev ? abbrev.toLowerCase() : undefined;
}

export function mergeTeamsWithCatalog(teams: Record<string, Team>): Record<string, Team> {
  const catalog = buildWc2026TeamCatalog();
  const merged: Record<string, Team> = { ...catalog };

  for (const [id, team] of Object.entries(teams)) {
    const patched = mergeTeamWithCatalog(team);
    merged[id] = patched;
    const abbrev = patched.abbreviation.toUpperCase();
    const catalogId = abbrev.toLowerCase();
    if (catalogId !== id && merged[catalogId]) {
      merged[catalogId] = { ...merged[catalogId], ...patched, id: catalogId };
    }
  }

  return merged;
}
