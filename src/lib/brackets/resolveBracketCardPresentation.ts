import type { BracketMatch, MergedMatch, PenaltyShootout, Team } from "../../types";
import { resolveMatchWinner } from "../resolveMatchWinner";

export type BracketCardPresentation = {
  scoreHome?: number;
  scoreAway?: number;
  penaltyShootout?: PenaltyShootout;
  winnerTeamId?: string;
  /** Use CompactMatchScore for in-progress live data. */
  liveScoreMatch?: MergedMatch;
};

function bracketMatchAsMerged(match: BracketMatch): MergedMatch {
  return {
    id: match.id,
    matchId: match.id,
    status: "completed",
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    penaltyShootout: match.penaltyShootout,
    locked: true,
  } as MergedMatch;
}

/**
 * Picks authoritative scores and winner for a bracket card.
 * Locked results beat unlocked ESPN polls; winner must agree with scores + PSO.
 */
export function resolveBracketCardPresentation(
  match: BracketMatch,
  liveMerged: MergedMatch | undefined,
  teamsById: Record<string, Team>
): BracketCardPresentation {
  const lockedLive =
    liveMerged?.locked && liveMerged.status === "completed" ? liveMerged : undefined;
  const bracketHasScores =
    match.homeScore !== undefined && match.awayScore !== undefined;
  const bracketCompleted = bracketHasScores ? bracketMatchAsMerged(match) : undefined;

  const authoritative = lockedLive ?? bracketCompleted;
  const inPlayLive =
    liveMerged &&
    liveMerged.status !== "completed" &&
    liveMerged.homeScore !== undefined &&
    !authoritative
      ? liveMerged
      : undefined;

  const resolvedWinner = authoritative
    ? resolveMatchWinner(authoritative, teamsById)
    : undefined;

  let winnerTeamId = resolvedWinner ?? match.winnerTeamId;

  if (
    resolvedWinner &&
    match.winnerTeamId &&
    resolvedWinner !== match.winnerTeamId &&
    !authoritative?.penaltyShootout &&
    !match.penaltyShootout
  ) {
    winnerTeamId = resolvedWinner;
  }

  const penaltyShootout =
    lockedLive?.penaltyShootout ?? match.penaltyShootout ?? undefined;

  if (inPlayLive) {
    return {
      liveScoreMatch: inPlayLive,
      winnerTeamId,
      penaltyShootout,
    };
  }

  return {
    scoreHome: authoritative?.homeScore,
    scoreAway: authoritative?.awayScore,
    penaltyShootout,
    winnerTeamId,
  };
}
