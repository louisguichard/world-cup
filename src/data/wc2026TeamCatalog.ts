import { applyOfficialGroupsToTeams } from "../lib/officialGroupRoster";
import type { GroupLetter, Team } from "../types";
import { TEAM_LOGO_OVERRIDES } from "./teamLogoOverrides";
import {
  WC2026_TEAM_NAMES,
  resolveCatalogTeamIdByName,
  resolveTeamAbbrevFromHint,
} from "./teamNameMap";

export { WC2026_TEAM_NAMES, TEAM_NAME_TO_ABBREV, resolveCatalogTeamIdByName, resolveTeamAbbrevFromHint } from "./teamNameMap";

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

/** Full country name from any team id / abbrev / name hint. */
export function resolveCatalogTeamName(hint: string): string | undefined {
  const abbrev = resolveTeamAbbrevFromHint(hint);
  return abbrev ? WC2026_TEAM_NAMES[abbrev] : undefined;
}

/** Catalog-backed team for display when store/API team is missing or incomplete. */
export function resolveTeamForDisplay(teamId: string, team?: Team): Team | undefined {
  if (team) return mergeTeamWithCatalog(team);
  const abbrev = resolveTeamAbbrevFromHint(teamId);
  return abbrev ? buildCatalogTeam(abbrev) : undefined;
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

const mergedTeamCache = new WeakMap<Team, Team>();

/** Merge API team onto catalog — keeps upstream id but fixes abbrev + crest. */
export function mergeTeamWithCatalog(team: Team): Team {
  const cached = mergedTeamCache.get(team);
  if (cached) return cached;

  const abbrev =
    resolveTeamAbbrevFromHint(team.abbreviation) ??
    resolveTeamAbbrevFromHint(team.name) ??
    resolveTeamAbbrevFromHint(team.shortName) ??
    resolveTeamAbbrevFromHint(team.id);

  if (!abbrev) return team;

  const catalog = buildCatalogTeam(abbrev, team.group);
  const logo = TEAM_LOGO_OVERRIDES[abbrev] ?? team.logo;

  const merged: Team = {
    ...team,
    abbreviation: abbrev,
    name: team.name || catalog.name,
    shortName: team.shortName || catalog.shortName,
    logo: logo ?? team.logo ?? "",
  };
  mergedTeamCache.set(team, merged);
  return merged;
}

/** Map any upstream team id (ESPN numeric, abbrev, name) to the catalog id (e.g. bra). */
export function resolveCanonicalTeamId(teamId: string, team?: Pick<Team, "abbreviation" | "name" | "shortName">): string {
  const fromTeam =
    resolveTeamAbbrevFromHint(team?.abbreviation) ??
    resolveTeamAbbrevFromHint(team?.name) ??
    resolveTeamAbbrevFromHint(team?.shortName);
  if (fromTeam) return fromTeam.toLowerCase();

  const fromId = resolveTeamAbbrevFromHint(teamId);
  if (fromId) return fromId.toLowerCase();

  return teamId;
}

/** One id per nation — used for qualification bucketing and standings keys. */
export function uniqueCanonicalTeamIds(teams: Record<string, Team>): string[] {
  const ids = new Set<string>();
  for (const team of Object.values(teams)) {
    ids.add(resolveCanonicalTeamId(team.id, team));
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/** Lookup team by catalog id, ESPN numeric alias, or name hint. */
export function resolveTeamFromStore(
  teams: Record<string, Team>,
  teamId: string
): Team | undefined {
  const direct = teams[teamId];
  if (direct) return mergeTeamWithCatalog(direct);

  const canonical = resolveCanonicalTeamId(teamId);
  const byCanonical = teams[canonical];
  if (byCanonical) return byCanonical;

  return resolveTeamForDisplay(teamId);
}

export function mergeTeamsWithCatalog(teams: Record<string, Team>): Record<string, Team> {
  const catalog = buildWc2026TeamCatalog();
  const merged: Record<string, Team> = { ...catalog };

  for (const team of Object.values(teams)) {
    const patched = mergeTeamWithCatalog(team);
    const abbrev = patched.abbreviation?.toUpperCase();
    if (!abbrev) continue;
    const catalogId = abbrev.toLowerCase();
    const canonical = merged[catalogId]
      ? { ...merged[catalogId], ...patched, id: catalogId }
      : { ...patched, id: catalogId };
    merged[catalogId] = canonical;
    if (team.id && team.id !== catalogId) {
      merged[team.id] = canonical;
    }
  }

  return applyOfficialGroupsToTeams(merged);
}
