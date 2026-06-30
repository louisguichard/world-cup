import type { KampGoal } from "../../schemas/kampMatches";
import { resolveCanonicalTeamId } from "../../data/wc2026TeamCatalog";
import type { MatchEvent, Team } from "../../types";

function teamIdForAbbrev(
  abbrev: string,
  homeTeamId: string,
  awayTeamId: string,
  teams: Record<string, Team>
): string {
  const key = abbrev.toUpperCase();
  const homeAbbrev = (
    teams[homeTeamId]?.abbreviation ??
    resolveCanonicalTeamId(homeTeamId, teams[homeTeamId])
  ).toUpperCase();
  const awayAbbrev = (
    teams[awayTeamId]?.abbreviation ??
    resolveCanonicalTeamId(awayTeamId, teams[awayTeamId])
  ).toUpperCase();
  if (key === homeAbbrev) return homeTeamId;
  if (key === awayAbbrev) return awayTeamId;
  return homeTeamId;
}

/** Map andrekamp goal list to canonical MatchEvent rows (fallback source). */
export function mapKampGoalsToEvents(
  gols: KampGoal[] | undefined,
  homeTeamId: string,
  awayTeamId: string,
  teams: Record<string, Team>
): MatchEvent[] {
  if (!gols?.length) return [];

  return gols.map((gol) => {
    const minute = Math.min(gol.minute, 120);
    const minuteExtra = gol.minute > 90 ? gol.minute - 90 : undefined;
    const displayMinute = minuteExtra ? 90 : minute;
    const playerSlug = gol.player.trim().toLowerCase().replace(/\s+/g, "-");

    return {
      providerId: `kamp:${gol.minute}:${playerSlug}`,
      minute: displayMinute,
      minuteExtra,
      type: gol.contra ? "own_goal" : "goal",
      teamId: teamIdForAbbrev(gol.team, homeTeamId, awayTeamId, teams),
      playerName: gol.player,
    };
  });
}
