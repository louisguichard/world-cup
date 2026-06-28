import { getAllScheduleEntries, getBroadcast } from "./BroadcastLookup";
import { resolveTeamFromStore } from "../data/wc2026TeamCatalog";
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
  const homeName = resolveTeamFromStore(teams, match.homeTeamId ?? "")?.name;
  const awayName = resolveTeamFromStore(teams, match.awayTeamId ?? "")?.name;

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
        resolveTeamFromStore(teams, match.homeTeamId)?.name ?? "",
        resolveTeamFromStore(teams, match.awayTeamId)?.name ?? "",
        match.date
      )
  };
}

export function formatKickoffLocal(kickoffUtc: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(kickoffUtc)
  );
}

/** Display string for match kickoff — prefers official schedule when linked. */
export function formatKickoffLabel(kickoffUtc: string): string {
  return `${KICKOFF_LABEL} · ${formatKickoffLocal(kickoffUtc)}`;
}

export function resolveOfficialMatchKickoff(match: Pick<MergedMatch, "matchId" | "date">): string {
  if (match.matchId) {
    const official = getBroadcast(match.matchId)?.kickoffUTC;
    if (official) return official;
  }
  return match.date;
}

/** @deprecated Use resolveOfficialMatchKickoff */
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
