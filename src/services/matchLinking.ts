import type { MergedMatch, Team } from "../types";
import type { SofaEvent } from "./SofaScoreClient";

const KICKOFF_TOLERANCE_MS = 15 * 60 * 1000;

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase();
}

function teamNameMatches(team: Team, sofaName: string): boolean {
  const norm = normalizeTeamName(sofaName);
  return (
    normalizeTeamName(team.name) === norm ||
    normalizeTeamName(team.shortName) === norm ||
    normalizeTeamName(team.abbreviation) === norm
  );
}

/** Links a SofaScore event to an existing ESPN-merged match by kickoff + team names. */
export function findEspnMatchForSofaEvent(
  merged: Record<string, MergedMatch>,
  ev: SofaEvent,
  teams: Record<string, Team>
): MergedMatch | undefined {
  const kickoffMs = ev.startTimestamp * 1000;

  const candidates = Object.values(merged).filter((m) => {
    const diff = Math.abs(Date.parse(m.date) - kickoffMs);
    if (diff > KICKOFF_TOLERANCE_MS) return false;

    const home = teams[m.homeTeamId];
    const away = teams[m.awayTeamId];
    if (!home || !away) return false;

    return teamNameMatches(home, ev.homeTeam.name) && teamNameMatches(away, ev.awayTeam.name);
  });

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    if (a.espnEventId && !b.espnEventId) return -1;
    if (!a.espnEventId && b.espnEventId) return 1;
    if (a.matchId && !b.matchId) return -1;
    if (!a.matchId && b.matchId) return 1;
    return 0;
  });

  return candidates[0];
}
