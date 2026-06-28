import { describe, expect, it } from "vitest";
import {
  mergeFootballLeagues,
  mergeFootballPredictionPools,
} from "./mergeFootballPredictions";
import type { FootballPredictionMatch } from "../services/FootballPredictionClient";

function match(
  overrides: Partial<FootballPredictionMatch> & Pick<FootballPredictionMatch, "homeTeam" | "awayTeam">
): FootballPredictionMatch {
  return {
    id: overrides.id ?? "1",
    homeTeam: overrides.homeTeam,
    awayTeam: overrides.awayTeam,
    date: overrides.date ?? "2026-06-15",
    leagueId: overrides.leagueId ?? "wc",
    prediction: overrides.prediction ?? "1",
    isFinished: overrides.isFinished ?? false,
    ...overrides,
  };
}

describe("mergeFootballPredictions", () => {
  it("merges same fixture from both APIs with averaged probability", () => {
    const merged = mergeFootballPredictionPools({
      todayDaily: [
        match({
          id: "t1",
          homeTeam: "Brazil",
          awayTeam: "France",
          prediction: "1",
          predictionProbability: 60,
          source: "today",
        }),
      ],
      boggioDaily: [
        match({
          id: "b1",
          homeTeam: "Brazil",
          awayTeam: "France",
          prediction: "1",
          predictionProbability: 70,
          source: "boggio",
        }),
      ],
      vipFeatured: [],
      vipScores: [],
    });

    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("merged");
    expect(merged[0]?.sources).toEqual(expect.arrayContaining(["today", "boggio"]));
    expect(merged[0]?.predictionProbability).toBe(65);
  });

  it("prefers VIP featured pick on conflicting predictions", () => {
    const merged = mergeFootballPredictionPools({
      todayDaily: [
        match({
          id: "t1",
          homeTeam: "Mexico",
          awayTeam: "USA",
          prediction: "X",
          predictionProbability: 55,
          source: "today",
        }),
      ],
      boggioDaily: [],
      vipFeatured: [
        match({
          id: "v1",
          homeTeam: "Mexico",
          awayTeam: "USA",
          prediction: "1",
          predictionProbability: 62,
          source: "today",
          vipTier: "featured",
        }),
      ],
      vipScores: [],
    });

    expect(merged[0]?.prediction).toBe("1");
    expect(merged[0]?.vipTier).toBe("featured");
  });

  it("deduplicates leagues from both sources", () => {
    const leagues = mergeFootballLeagues(
      [{ id: "1", name: "World Cup", country: "International" }],
      [{ id: "1", name: "World Cup", country: "International" }]
    );
    expect(leagues).toHaveLength(1);
  });
});
