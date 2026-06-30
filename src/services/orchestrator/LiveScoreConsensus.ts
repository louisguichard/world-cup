export type ScoreVote = {
  source: "wclive" | "espn" | "sportapi7" | "fifaPublic";
  matchId: string;
  homeScore: number;
  awayScore: number;
  clockMinute?: number;
  period?: string;
  timestamp: number;
};

export type ConsensusResult =
  | {
      agreed: true;
      homeScore: number;
      awayScore: number;
      clockMinute?: number;
      sources: ScoreVote["source"][];
    }
  | {
      agreed: false;
      votes: ScoreVote[];
      reason: string;
    };

const STALE_MS = 90_000;
const CLOCK_TOLERANCE_MIN = 3;

function scoresMatch(a: ScoreVote, b: ScoreVote): boolean {
  return a.homeScore === b.homeScore && a.awayScore === b.awayScore;
}

function pickClock(votes: ScoreVote[]): number | undefined {
  const minutes = votes.map((v) => v.clockMinute).filter((m): m is number => m !== undefined);
  if (minutes.length === 0) return undefined;
  const max = Math.max(...minutes);
  const min = Math.min(...minutes);
  if (max - min <= CLOCK_TOLERANCE_MIN) return max;
  return max;
}

/** Computes 2-of-3 score agreement from live source votes. */
export function computeScoreConsensus(votes: ScoreVote[]): ConsensusResult {
  const fresh = votes.filter((v) => Date.now() - v.timestamp <= STALE_MS);

  if (fresh.length === 0) {
    return { agreed: false, votes, reason: "all_stale" };
  }

  if (fresh.length === 1) {
    return { agreed: false, votes: fresh, reason: "insufficient_votes" };
  }

  for (let i = 0; i < fresh.length; i += 1) {
    for (let j = i + 1; j < fresh.length; j += 1) {
      if (scoresMatch(fresh[i], fresh[j])) {
        const agreeing = fresh.filter((v) => scoresMatch(v, fresh[i]));
        return {
          agreed: true,
          homeScore: fresh[i].homeScore,
          awayScore: fresh[i].awayScore,
          clockMinute: pickClock(agreeing),
          sources: agreeing.map((v) => v.source),
        };
      }
    }
  }

  return { agreed: false, votes: fresh, reason: "disagreement" };
}
