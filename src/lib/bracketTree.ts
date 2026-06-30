import { KNOCKOUT_ROUND_FIXTURES } from "./brackets/knockoutRoundFixtures";
import type { MergedMatch } from "../types";

/** Maps each knockout match → its two feeder match IDs (R32 entries are null). */
export const BRACKET_FEED_MAP: Record<string, [string, string] | null> = buildBracketFeedMap();

function buildBracketFeedMap(): Record<string, [string, string] | null> {
  const map: Record<string, [string, string] | null> = {};

  for (let n = 73; n <= 88; n += 1) {
    map[`M${n}`] = null;
  }

  for (const fixtures of Object.values(KNOCKOUT_ROUND_FIXTURES)) {
    for (const [matchId, homeSeed, awaySeed] of fixtures) {
      map[matchId] = [seedLabelToMatchId(homeSeed), seedLabelToMatchId(awaySeed)];
    }
  }

  return map;
}

export function seedLabelToMatchId(seedLabel: string): string {
  if (seedLabel.startsWith("W") || seedLabel.startsWith("L")) {
    return `M${seedLabel.slice(1)}`;
  }
  return seedLabel;
}

/** First downstream match that consumes this feeder (e.g. M73 → M90). */
export function findChildBracketMatchId(feederMatchId: string): string | undefined {
  const entry = Object.entries(BRACKET_FEED_MAP).find(([, feeders]) => feeders?.includes(feederMatchId));
  return entry?.[0];
}

export function siblingFeederMatchId(childMatchId: string, feederMatchId: string): string | undefined {
  const feeders = BRACKET_FEED_MAP[childMatchId];
  return feeders?.find((id) => id !== feederMatchId);
}

export function isKnockoutBracketMatchId(matchId: string): boolean {
  const num = Number(matchId.replace(/^M/, ""));
  return Number.isFinite(num) && num >= 73 && num <= 104;
}

export function resolveBracketMatchId(match: Pick<MergedMatch, "id" | "matchId">): string | null {
  const candidates = [match.matchId, match.id].filter((key): key is string => Boolean(key));
  return candidates.find((key) => isKnockoutBracketMatchId(key)) ?? null;
}

export function lookupBracketLiveMatch(
  liveMatches: Record<string, MergedMatch>,
  bracketMatchId: string
): MergedMatch | undefined {
  if (liveMatches[bracketMatchId]) return liveMatches[bracketMatchId];
  return Object.values(liveMatches).find(
    (m) => m.matchId === bracketMatchId || m.id === bracketMatchId
  );
}
