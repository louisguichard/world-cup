import type { GroupLetter, Team } from "../../types";
import { groupLetters } from "../../types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function parseGroup(raw: unknown): GroupLetter | undefined {
  const g = str(raw)?.toUpperCase();
  if (g && (groupLetters as readonly string[]).includes(g)) return g as GroupLetter;
  return undefined;
}

/** Converts WC2026 teams API payload into partial Team fields. */
export function normalizeWC2026Team(raw: unknown): Partial<Team> {
  if (!isRecord(raw)) return {};
  const partial: Partial<Team> = {};

  if (str(raw.id)) partial.id = str(raw.id)!;
  if (str(raw.name)) partial.name = str(raw.name)!;
  if (str(raw.shortName)) partial.shortName = str(raw.shortName)!;
  if (str(raw.abbreviation)) partial.abbreviation = str(raw.abbreviation)!;
  if (str(raw.logo)) partial.logo = str(raw.logo);
  if (str(raw.color)) partial.color = str(raw.color);

  return partial;
}

/** Converts Zafronix team profile payload into partial Team fields. */
export function normalizeZafronixTeam(raw: unknown): Partial<Team> {
  if (!isRecord(raw)) return {};

  const partial: Partial<Team> = {};
  const name = str(raw.name) ?? str(raw.teamName);
  if (name) {
    partial.name = name;
    partial.shortName = str(raw.shortName) ?? name;
  }

  const abbrev = str(raw.abbreviation) ?? str(raw.code) ?? str(raw.fifaCode);
  if (abbrev) partial.abbreviation = abbrev.toUpperCase();

  const logo =
    str(raw.logo) ??
    str(raw.crest) ??
    str(raw.crestUrl) ??
    str(raw.flag) ??
    str(raw.image);
  if (logo) partial.logo = logo;

  const group = parseGroup(raw.group);
  if (group) partial.group = group;

  if (typeof raw.fifaRank === "number") partial.fifaRank = raw.fifaRank;

  return partial;
}

/** Converts Free API team details payload into partial Team fields. */
export function normalizeFreeAPITeam(raw: unknown): Partial<Team> {
  if (!isRecord(raw)) return {};

  const partial: Partial<Team> = {};
  const response = isRecord(raw.response) ? raw.response : raw;

  if (str(response.id)) partial.id = str(response.id)!;
  if (str(response.name)) partial.name = str(response.name)!;
  if (str(response.shortName)) partial.shortName = str(response.shortName)!;

  const logo = str(response.logo) ?? str(response.image);
  if (logo) partial.logo = logo;

  return partial;
}

/** Converts SofaScore team payload into partial Team fields. */
export function normalizeSofaScoreTeam(raw: unknown): Partial<Team> {
  if (!isRecord(raw)) return {};
  const team = isRecord(raw.team) ? raw.team : raw;
  const partial: Partial<Team> = {};

  if (team.id != null) partial.id = String(team.id);
  if (str(team.name)) partial.name = str(team.name)!;
  if (str(team.shortName)) partial.shortName = str(team.shortName)!;
  if (str(team.nameCode)) partial.abbreviation = str(team.nameCode)!.toUpperCase();

  const logo = str(team.logo) ?? str(team.image);
  if (logo) partial.logo = logo;

  return partial;
}

const TEAM_FILL_FIELDS: (keyof Team)[] = [
  "id",
  "name",
  "shortName",
  "abbreviation",
  "group",
  "logo",
  "color",
  "alternateColor",
  "fifaRank",
  "fifaPoints",
];

/** Merges team partials — later sources fill gaps, never overwrite non-empty values. */
export function mergeTeamPartials(...partials: Partial<Team>[]): Partial<Team> {
  const result: Partial<Team> = {};

  for (const partial of partials) {
    for (const key of TEAM_FILL_FIELDS) {
      const incoming = partial[key];
      const existing = result[key];
      if (incoming === undefined || incoming === null || incoming === "") continue;
      if (existing !== undefined && existing !== null && existing !== "") continue;
      (result as Record<string, unknown>)[key] = incoming;
    }
  }

  return result;
}
