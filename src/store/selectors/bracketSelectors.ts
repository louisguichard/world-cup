import { useShallow } from "zustand/react/shallow";
import type { BracketViewMode, GroupStanding, MergedMatch, PolymarketMatchMarket, ScoreOverride } from "../../types";
import { useStore } from "../index";

function isKnockoutLiveMatch(match: MergedMatch): boolean {
  return !match.group;
}

/** Stable string — canonical dataset memo only recomputes when relevant scores change. */
export function buildBracketDatasetFingerprint(
  liveMatches: Record<string, MergedMatch>,
  mode: BracketViewMode
): string {
  const parts: string[] = [];
  for (const [key, match] of Object.entries(liveMatches)) {
    if (mode === "confirmed" && match.group) continue;
    const id = match.matchId ?? match.id ?? key;
    parts.push(
      `${id}:${match.status}:${match.homeScore ?? ""}:${match.awayScore ?? ""}:${match.locked ? 1 : 0}`
    );
  }
  parts.sort();
  return parts.join("|");
}

/** Knockout live matches only — stable shallow reference when group-stage polls update. */
export function useKnockoutLiveMatches() {
  return useStore(
    useShallow((s) => {
      const result: Record<string, MergedMatch> = {};
      for (const [key, match] of Object.entries(s.liveMatches)) {
        if (isKnockoutLiveMatch(match)) result[key] = match;
      }
      return result;
    })
  );
}

export function useBracketTeams() {
  return useStore((s) => s.teams);
}

export function useBracketDatasetFingerprint(mode: BracketViewMode) {
  return useStore((s) => buildBracketDatasetFingerprint(s.liveMatches, mode));
}

/** Full bracket projection input — stable unless scores, standings, markets, or overrides change. */
export function buildBracketProjectionFingerprint(
  liveMatches: Record<string, MergedMatch>,
  mode: BracketViewMode,
  groupStandings: GroupStanding[],
  knockoutMarkets: PolymarketMatchMarket[],
  scoreOverrides: Record<string, ScoreOverride>
): string {
  const standingsKey = groupStandings
    .flatMap((standing) =>
      standing.rows.map(
        (row) =>
          `${standing.group}:${row.teamId}:${row.points}:${row.goalDifference}:${row.played}`
      )
    )
    .sort()
    .join("|");
  const marketsKey = knockoutMarkets
    .map((market) => `${market.teamAKey}:${market.teamBKey}:${market.date}:${market.kind}`)
    .sort()
    .join("|");
  const overridesKey = Object.keys(scoreOverrides).sort().join("|");
  return [
    buildBracketDatasetFingerprint(liveMatches, mode),
    standingsKey,
    marketsKey,
    overridesKey,
  ].join("::");
}

export function useBracketProjectionFingerprint(mode: BracketViewMode) {
  return useStore((s) =>
    buildBracketProjectionFingerprint(
      s.liveMatches,
      mode,
      s.groupStandings,
      s.knockoutMarkets,
      s.scoreOverrides
    )
  );
}
