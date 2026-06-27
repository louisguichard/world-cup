import { describe, expect, it } from "vitest";
import {
  normalizeLeagues,
  normalizePerformanceStats,
  normalizePredictionMatch,
} from "./FootballPredictionClient";

describe("FootballPredictionClient normalize", () => {
  it("normalizes leagues", () => {
    const leagues = normalizeLeagues({
      leagues: [{ id: "1", name: "Premier League", country: "England" }],
    });
    expect(leagues[0]?.name).toBe("Premier League");
  });

  it("normalizes prediction match", () => {
    const match = normalizePredictionMatch({
      id: "abc",
      home_team: "Brazil",
      away_team: "France",
      date: "2026-06-27",
      league: "16",
      prediction: "1",
      prediction_odd: 2.1,
      prediction_probability: 55,
      is_finished: false,
    });
    expect(match?.homeTeam).toBe("Brazil");
    expect(match?.predictionProbability).toBe(55);
  });

  it("normalizes performance stats", () => {
    const perf = normalizePerformanceStats({
      date: "2026-06-27",
      featured: { classic: { profit_loss: 1, winning_percentage: 100, count: 1, count_won: 1, count_lost: 0, avg_prob: 50, avg_odd: 2 } },
      all: {},
    });
    expect(perf?.date).toBe("2026-06-27");
    expect(perf?.featured.classic?.winningPercentage).toBe(100);
  });
});
