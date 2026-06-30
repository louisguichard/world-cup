import { describe, expect, it } from "vitest";
import { computeScoreConsensus, type ScoreVote } from "./LiveScoreConsensus";

function vote(
  partial: Partial<ScoreVote> & Pick<ScoreVote, "source" | "matchId" | "homeScore" | "awayScore">
): ScoreVote {
  return {
    timestamp: Date.now(),
    ...partial,
  };
}

describe("computeScoreConsensus", () => {
  it("agrees when two votes match", () => {
    const result = computeScoreConsensus([
      vote({ source: "wclive", matchId: "1", homeScore: 2, awayScore: 1, clockMinute: 45 }),
      vote({ source: "espn", matchId: "1", homeScore: 2, awayScore: 1, clockMinute: 46 }),
    ]);
    expect(result.agreed).toBe(true);
    if (result.agreed) {
      expect(result.homeScore).toBe(2);
      expect(result.sources).toContain("wclive");
    }
  });

  it("returns insufficient_votes for single fresh vote", () => {
    const result = computeScoreConsensus([
      vote({ source: "wclive", matchId: "1", homeScore: 1, awayScore: 0 }),
    ]);
    expect(result.agreed).toBe(false);
    if (!result.agreed) expect(result.reason).toBe("insufficient_votes");
  });

  it("excludes stale votes", () => {
    const stale = vote({
      source: "espn",
      matchId: "1",
      homeScore: 2,
      awayScore: 1,
      timestamp: Date.now() - 120_000,
    });
    const result = computeScoreConsensus([
      stale,
      vote({ source: "wclive", matchId: "1", homeScore: 1, awayScore: 0 }),
    ]);
    expect(result.agreed).toBe(false);
    if (!result.agreed) expect(result.reason).toBe("insufficient_votes");
  });

  it("reports disagreement when scores differ", () => {
    const result = computeScoreConsensus([
      vote({ source: "wclive", matchId: "1", homeScore: 2, awayScore: 1 }),
      vote({ source: "espn", matchId: "1", homeScore: 1, awayScore: 1 }),
      vote({ source: "sportapi7", matchId: "1", homeScore: 0, awayScore: 0 }),
    ]);
    expect(result.agreed).toBe(false);
    if (!result.agreed) expect(result.reason).toBe("disagreement");
  });

  it("tiebreaks with sportapi7 when wclive and sportapi7 agree", () => {
    const result = computeScoreConsensus([
      vote({ source: "wclive", matchId: "1", homeScore: 3, awayScore: 2 }),
      vote({ source: "espn", matchId: "1", homeScore: 2, awayScore: 2 }),
      vote({ source: "sportapi7", matchId: "1", homeScore: 3, awayScore: 2 }),
    ]);
    expect(result.agreed).toBe(true);
    if (result.agreed) {
      expect(result.homeScore).toBe(3);
      expect(result.sources).toContain("sportapi7");
    }
  });

  it("agrees when fifaPublic matches espn", () => {
    const result = computeScoreConsensus([
      vote({ source: "fifaPublic", matchId: "M12", homeScore: 1, awayScore: 0 }),
      vote({ source: "espn", matchId: "M12", homeScore: 1, awayScore: 0 }),
    ]);
    expect(result.agreed).toBe(true);
    if (result.agreed) {
      expect(result.sources).toContain("fifaPublic");
    }
  });
});
