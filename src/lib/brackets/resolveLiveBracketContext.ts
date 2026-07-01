import { lookupBracketLiveMatch } from "../bracketTree";
import { isResultFinalLocked } from "../liveDataContract";
import { resolveMatchWinner } from "../resolveMatchWinner";
import type { BracketMatch, MergedMatch, Team } from "../../types";

export type BracketContextMatchDisplay = {
  homeTeamId?: string;
  awayTeamId?: string;
  homeScore?: number;
  awayScore?: number;
  penaltyShootout?: MergedMatch["penaltyShootout"];
  winnerTeamId?: string;
  isLive: boolean;
  /** Prefer CompactMatchScore when set. */
  liveScoreMatch?: MergedMatch;
};

function lockedLiveDisplay(
  live: MergedMatch,
  teamsById: Record<string, Team>
): BracketContextMatchDisplay {
  return {
    homeTeamId: live.homeTeamId,
    awayTeamId: live.awayTeamId,
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    penaltyShootout: live.penaltyShootout,
    winnerTeamId: resolveMatchWinner(live, teamsById) ?? undefined,
    isLive: false,
  };
}

/** Prefer locked live row over projected bracket slot for feeder/sibling display. */
export function resolveFeederMatchDisplay(
  matchId: string,
  bracketSlot: BracketMatch | undefined,
  liveMatches: Record<string, MergedMatch>,
  teamsById: Record<string, Team>
): BracketContextMatchDisplay {
  const live = lookupBracketLiveMatch(liveMatches, matchId);

  if (live && isResultFinalLocked(live)) {
    return lockedLiveDisplay(live, teamsById);
  }

  if (live?.status === "live" && live.homeScore !== undefined) {
    return {
      homeTeamId: live.homeTeamId ?? bracketSlot?.homeTeamId,
      awayTeamId: live.awayTeamId ?? bracketSlot?.awayTeamId,
      liveScoreMatch: live,
      isLive: true,
    };
  }

  if (bracketSlot) {
    return {
      homeTeamId: bracketSlot.homeTeamId,
      awayTeamId: bracketSlot.awayTeamId,
      homeScore: bracketSlot.homeScore,
      awayScore: bracketSlot.awayScore,
      penaltyShootout: bracketSlot.penaltyShootout,
      winnerTeamId: bracketSlot.winnerTeamId,
      isLive: false,
    };
  }

  if (live) {
    return {
      homeTeamId: live.homeTeamId,
      awayTeamId: live.awayTeamId,
      homeScore: live.homeScore,
      awayScore: live.awayScore,
      isLive: live.status === "live",
      liveScoreMatch: live.status === "live" ? live : undefined,
    };
  }

  return { isLive: false };
}

function feederMatchIdFromSeed(seed: string | undefined): string | undefined {
  if (!seed?.startsWith("W")) return undefined;
  const num = seed.slice(1);
  return num ? `M${num}` : undefined;
}

/** When a locked feeder exists, downstream slot follows feeder winner — not stale projection. */
export function resolveDownstreamSlotDisplay(
  match: BracketMatch,
  liveMatches: Record<string, MergedMatch>,
  teamsById: Record<string, Team>
): BracketContextMatchDisplay {
  const homeFeederId = feederMatchIdFromSeed(match.homeSeedLabel);
  const awayFeederId = feederMatchIdFromSeed(match.awaySeedLabel);

  let homeTeamId = match.homeTeamId;
  let awayTeamId = match.awayTeamId;
  let homeCertainty = match.homeCertainty;
  let awayCertainty = match.awayCertainty;

  if (homeFeederId) {
    const feederLive = lookupBracketLiveMatch(liveMatches, homeFeederId);
    if (feederLive && isResultFinalLocked(feederLive)) {
      const winner = resolveMatchWinner(feederLive, teamsById);
      if (winner) {
        homeTeamId = winner;
        homeCertainty = "confirmed";
      }
    }
  }

  if (awayFeederId) {
    const feederLive = lookupBracketLiveMatch(liveMatches, awayFeederId);
    if (feederLive && isResultFinalLocked(feederLive)) {
      const winner = resolveMatchWinner(feederLive, teamsById);
      if (winner) {
        awayTeamId = winner;
        awayCertainty = "confirmed";
      }
    }
  }

  return {
    homeTeamId,
    awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    winnerTeamId: match.winnerTeamId,
    isLive: false,
    ...(homeCertainty === "confirmed" || awayCertainty === "confirmed"
      ? {}
      : { liveScoreMatch: undefined }),
  };
}
