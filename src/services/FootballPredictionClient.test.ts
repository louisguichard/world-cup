import { describe, expect, it } from "vitest";
import {
  findWorldCupLeague,
  isWorldCupPrediction,
  normalizeLeagues,
  normalizePerformanceStats,
  normalizePredictionMatch,
  normalizeStringList,
} from "./FootballPredictionClient";

describe("FootballPredictionClient normalize", () => {
  it("normalizes v2 federations list", () => {
    const list = normalizeStringList({ data: ["UEFA", "CONCACAF"] });
    expect(list).toEqual(["UEFA", "CONCACAF"]);
  });

  it("normalizes v2 leagues", () => {
    const leagues = normalizeLeagues({
      data: [{ id: "1", name: "Premier League", country: "England" }],
    });
    expect(leagues[0]?.name).toBe("Premier League");
  });

  it("normalizes legacy leagues", () => {
    const leagues = normalizeLeagues({
      leagues: [{ id: "1", name: "Premier League", country: "England" }],
    });
    expect(leagues[0]?.name).toBe("Premier League");
  });

  it("normalizes v2 prediction match", () => {
    const match = normalizePredictionMatch({
      id: 40838,
      home_team: "Brazil",
      away_team: "France",
      start_date: "2026-06-27T19:00:00",
      competition_name: "World Cup",
      federation: "CONMEBOL",
      market: "classic",
      prediction: "1",
      probabilities: { "1": 0.542 },
      odds: { "1": 1.85 },
      status: "pending",
    });
    expect(match?.homeTeam).toBe("Brazil");
    expect(match?.predictionProbability).toBe(54.2);
    expect(match?.predictionOdd).toBe(1.85);
    expect(match?.federation).toBe("CONMEBOL");
  });

  it("normalizes legacy prediction match", () => {
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

  it("normalizes v2 performance stats", () => {
    const perf = normalizePerformanceStats({
      data: {
        market: "classic",
        accuracy: {
          last_7_days: 0.68,
          last_30_days: 0.62,
          yesterday: 0.75,
        },
        details: {
          last_7_days: { total: 100, won: 68, lost: 32 },
          last_30_days: { total: 400, won: 248, lost: 152 },
        },
      },
    });
    expect(perf?.featured.classic?.winningPercentage).toBe(68);
    expect(perf?.all.classic?.winningPercentage).toBe(62);
    expect(perf?.accuracy?.yesterday).toBe(0.75);
  });

  it("normalizes legacy performance stats", () => {
    const perf = normalizePerformanceStats({
      date: "2026-06-27",
      featured: {
        classic: {
          profit_loss: 1,
          winning_percentage: 100,
          count: 1,
          count_won: 1,
          count_lost: 0,
          avg_prob: 50,
          avg_odd: 2,
        },
      },
      all: {},
    });
    expect(perf?.date).toBe("2026-06-27");
    expect(perf?.featured.classic?.winningPercentage).toBe(100);
  });

  it("finds world cup league from catalog list", () => {
    const league = findWorldCupLeague([
      { id: "1", name: "Premier League", country: "England" },
      { id: "wc", name: "FIFA World Cup", country: "International" },
    ]);
    expect(league?.id).toBe("wc");
  });

  it("flags world cup predictions", () => {
    expect(
      isWorldCupPrediction({
        id: "1",
        homeTeam: "Brazil",
        awayTeam: "France",
        date: "2026-06-27",
        leagueId: "FIFA World Cup",
        prediction: "1",
        isFinished: false,
        competitionName: "World Cup",
      })
    ).toBe(true);
  });
});
