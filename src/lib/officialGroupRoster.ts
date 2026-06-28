import { buildOfficialGroupRosterFromAssignments } from "../data/officialGroupAssignments";
import type { GroupLetter, Team } from "../types";
import { groupLetters } from "../types";

let cachedRoster: Partial<Record<GroupLetter, string[]>> | null = null;

/** Test-only: reset module cache between vitest cases. */
export function resetOfficialGroupRosterCache(): void {
  cachedRoster = null;
}

/** Official 48-team group assignments from the FIFA 2026 draw. */
export function buildOfficialGroupRoster(): Record<GroupLetter, string[]> {
  if (cachedRoster) {
    return cachedRoster as Record<GroupLetter, string[]>;
  }

  cachedRoster = buildOfficialGroupRosterFromAssignments();
  return cachedRoster as Record<GroupLetter, string[]>;
}

export function applyOfficialGroupsToTeams(teams: Record<string, Team>): Record<string, Team> {
  const roster = buildOfficialGroupRoster();
  const groupByCatalogId = new Map<string, GroupLetter>();
  for (const group of groupLetters) {
    for (const teamId of roster[group] ?? []) {
      groupByCatalogId.set(teamId, group);
    }
  }

  const next: Record<string, Team> = {};
  for (const [key, team] of Object.entries(teams)) {
    const officialGroup = groupByCatalogId.get(team.id.toLowerCase());
    next[key] = officialGroup && team.group !== officialGroup ? { ...team, group: officialGroup } : team;
  }

  return next;
}
