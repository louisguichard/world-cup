import {
  resolveCanonicalTeamId,
  resolveTeamFromStore,
} from "../../data/wc2026TeamCatalog";
import type { Team } from "../../types";
import type { CanonicalTeamId, TeamRegistry } from "./types";

export function buildTeamRegistry(teams: Record<string, Team>): TeamRegistry {
  const espnTeamId = new Map<string, CanonicalTeamId>();
  const wc2026TeamId = new Map<string, CanonicalTeamId>();

  for (const team of Object.values(teams)) {
    const canonical = resolveCanonicalTeamId(team.id, team);
    if (/^\d+$/.test(team.id) && team.id !== canonical) {
      espnTeamId.set(team.id, canonical);
    }
    if (team.wc2026TeamId && team.wc2026TeamId !== canonical) {
      wc2026TeamId.set(team.wc2026TeamId, canonical);
    }
  }

  return { espnTeamId, wc2026TeamId };
}

function lookupTeam(teams: Record<string, Team>, teamId: string): Team | undefined {
  return resolveTeamFromStore(teams, teamId);
}

/** Map any upstream team id to catalog id (esp, fra, …). */
export function resolveTeamRef(
  rawId: string | undefined,
  teams: Record<string, Team> = {},
  teamRegistry?: TeamRegistry
): string {
  if (!rawId?.trim()) return "";

  const fromEspn = teamRegistry?.espnTeamId.get(rawId);
  if (fromEspn) return fromEspn;

  const fromWc2026 = teamRegistry?.wc2026TeamId.get(rawId);
  if (fromWc2026) return fromWc2026;

  const team = lookupTeam(teams, rawId);
  return resolveCanonicalTeamId(rawId, team);
}

export function canonicalizeMatchTeamIdsWithRegistry(
  match: Pick<{ homeTeamId: string; awayTeamId: string }, "homeTeamId" | "awayTeamId">,
  teams: Record<string, Team>,
  teamRegistry?: TeamRegistry
): { homeTeamId: string; awayTeamId: string } {
  return {
    homeTeamId: resolveTeamRef(match.homeTeamId, teams, teamRegistry),
    awayTeamId: resolveTeamRef(match.awayTeamId, teams, teamRegistry),
  };
}
