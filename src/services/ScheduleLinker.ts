import { getAllScheduleEntries } from "./BroadcastLookup";
import { matchCompositeKey, normalizeKickoffUtc, pairKey } from "../lib/normalize";
import type { MatchScheduleEntry, MergedMatch, Team } from "../types";

export const KICKOFF_LABEL = "Kick off";

export type ScheduleLinkIndices = {
  composite: Record<string, string>;
  pair: Record<string, string>;
  kickoff: Record<string, string>;
};

export function buildScheduleLinkIndex(
  entries: MatchScheduleEntry[] = getAllScheduleEntries()
): ScheduleLinkIndices {
  const composite: Record<string, string> = {};
  const pair: Record<string, string> = {};
  const kickoff: Record<string, string> = {};

  for (const entry of entries) {
    const matchId = `M${entry.matchNumber}`;
    composite[matchCompositeKey(entry.homeTeam, entry.awayTeam, entry.kickoff.utc)] = matchId;
    pair[pairKey(entry.homeTeam, entry.awayTeam)] = matchId;
    kickoff[normalizeKickoffUtc(entry.kickoff.utc)] = matchId;
  }

  return { composite, pair, kickoff };
}

const scheduleLinkIndices = buildScheduleLinkIndex();

export function linkMatchToSchedule(
  match: Partial<MergedMatch>,
  teams: Record<string, Team>
): string | undefined {
  const homeName = teams[match.homeTeamId ?? ""]?.name;
  const awayName = teams[match.awayTeamId ?? ""]?.name;

  if (homeName && awayName) {
    const byPair = scheduleLinkIndices.pair[pairKey(homeName, awayName)];
    if (byPair) return byPair;

    if (match.date) {
      const byComposite = scheduleLinkIndices.composite[matchCompositeKey(homeName, awayName, match.date)];
      if (byComposite) return byComposite;
    }
  }

  if (match.date) {
    return scheduleLinkIndices.kickoff[normalizeKickoffUtc(match.date)];
  }

  return undefined;
}

export function enrichMatchWithScheduleId(
  match: MergedMatch,
  teams: Record<string, Team>
): MergedMatch {
  const matchId = linkMatchToSchedule(match, teams);
  if (!matchId || match.matchId === matchId) return match;
  return {
    ...match,
    matchId,
    compositeKey:
      match.compositeKey ??
      matchCompositeKey(
        teams[match.homeTeamId]?.name ?? "",
        teams[match.awayTeamId]?.name ?? "",
        match.date
      )
  };
}

export function formatKickoffLocal(kickoffUtc: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(kickoffUtc)
  );
}

/** Display string for match kickoff — always sourced from the live feed (`match.date`). */
export function formatKickoffLabel(kickoffUtc: string): string {
  return `${KICKOFF_LABEL} · ${formatKickoffLocal(kickoffUtc)}`;
}

/** Prefer ESPN/SofaScore kickoff from the live feed when linked by official match id (e.g. M4). */
export function resolveKickoffByMatchId(
  officialMatchId: string,
  fallbackUtc: string,
  liveMatches: Iterable<MergedMatch>
): string {
  for (const m of liveMatches) {
    if (m.matchId === officialMatchId && m.date) return m.date;
  }
  return fallbackUtc;
}

export { normalizeKickoffUtc };
