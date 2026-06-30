import { TEAM_LOGO_OVERRIDES } from "../data/teamLogoOverrides";
import {
  mergeTeamWithCatalog,
  resolveTeamAbbrevFromHint,
  resolveTeamLogoByAbbrev,
  resolveTeamLogoFromHint,
} from "../data/wc2026TeamCatalog";
import type { Team } from "../types";

/** Wikipedia kit templates (shorts, shirts, socks) are not team crests. */
export function isInvalidTeamLogoUrl(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (lower.includes("kit_shorts") || lower.includes("kit_shirt") || lower.includes("kit_socks")) {
    return true;
  }
  if (/kit_[a-z]{3}\d{4}/i.test(url)) return true;
  return false;
}

function resolveTeamAbbrev(team: Pick<Team, "abbreviation" | "name" | "shortName" | "id">): string | undefined {
  return (
    resolveTeamAbbrevFromHint(team.abbreviation) ??
    resolveTeamAbbrevFromHint(team.name) ??
    resolveTeamAbbrevFromHint(team.shortName) ??
    resolveTeamAbbrevFromHint(team.id)
  );
}

export function resolveTeamLogo(team: Pick<Team, "abbreviation" | "logo" | "name" | "shortName" | "id"> | undefined): string | undefined {
  if (!team) return undefined;

  const abbrev = resolveTeamAbbrev(team);
  if (abbrev) {
    const override = TEAM_LOGO_OVERRIDES[abbrev];
    if (override) return override;
  }

  return (
    resolveTeamLogoFromHint(team.abbreviation) ??
    resolveTeamLogoFromHint(team.name) ??
    resolveTeamLogoFromHint(team.shortName) ??
    resolveTeamLogoFromHint(team.id)
  );
}

export { resolveTeamLogoByAbbrev, resolveTeamLogoFromHint };

export function applyTeamLogoOverrides(teams: Record<string, Team>): Record<string, Team> {
  const patched: Record<string, Team> = {};

  for (const [id, team] of Object.entries(teams)) {
    const merged = mergeTeamWithCatalog(team);
    const logo = resolveTeamLogo(merged);
    const withLogo = logo && logo !== merged.logo ? { ...merged, logo } : merged;
    patched[id] = withLogo;
  }

  return patched;
}

/** Applies logo overrides to a team array (e.g. bootstrap / simulator load). */
export function applyTeamLogoOverridesList(teams: Team[]): Team[] {
  const patched = applyTeamLogoOverrides(Object.fromEntries(teams.map((team) => [team.id, team])));
  return teams.map((team) => patched[team.id] ?? team);
}
