import { TEAM_LOGO_OVERRIDES } from "../data/teamLogoOverrides";
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

export function resolveTeamLogo(team: Pick<Team, "abbreviation" | "logo"> | undefined): string | undefined {
  if (!team) return undefined;

  const abbrev = team.abbreviation?.toUpperCase();
  if (abbrev && TEAM_LOGO_OVERRIDES[abbrev]) {
    return TEAM_LOGO_OVERRIDES[abbrev];
  }

  if (team.logo && !isInvalidTeamLogoUrl(team.logo)) {
    return team.logo;
  }

  return undefined;
}

export function applyTeamLogoOverrides(teams: Record<string, Team>): Record<string, Team> {
  const patched: Record<string, Team> = {};

  for (const [id, team] of Object.entries(teams)) {
    const logo = resolveTeamLogo(team);
    patched[id] = logo !== team.logo ? { ...team, logo: logo ?? "" } : team;
  }

  return patched;
}

/** Applies logo overrides to a team array (e.g. bootstrap / simulator load). */
export function applyTeamLogoOverridesList(teams: Team[]): Team[] {
  const patched = applyTeamLogoOverrides(Object.fromEntries(teams.map((team) => [team.id, team])));
  return teams.map((team) => patched[team.id] ?? team);
}
