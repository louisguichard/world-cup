import { describe, expect, it } from "vitest";
import { sportHighlightsEndpoints } from "../config/sportHighlightsEndpoints";
import { mapHighlightlyStatistics } from "./matchDetail/fetchHighlightlyMatchBundle";

describe("sportHighlightsEndpoints", () => {
  it("builds football-highlights-api routes without /football prefix", () => {
    expect(sportHighlightsEndpoints.countries()).toBe("/countries");
    expect(sportHighlightsEndpoints.match(123)).toBe("/matches/123");
    expect(sportHighlightsEndpoints.team(5890)).toBe("/teams/5890");
    expect(sportHighlightsEndpoints.highlights({ date: "2026-06-26", limit: 5 })).toBe(
      "/highlights?date=2026-06-26&limit=5"
    );
    expect(sportHighlightsEndpoints.head2Head(1, 2)).toBe(
      "/head-2-head?teamIdOne=1&teamIdTwo=2"
    );
    expect(sportHighlightsEndpoints.teamStatistics(5890, { fromDate: "2026-01-01" })).toBe(
      "/teams/statistics/5890?fromDate=2026-01-01"
    );
  });
});

describe("mapHighlightlyStatistics", () => {
  it("maps display names to team stats", () => {
    const bundle = mapHighlightlyStatistics("m1", "home", "away", [
      {
        team: { id: 1, name: "Home" },
        statistics: [
          { displayName: "Total shots", value: 10 },
          { displayName: "Ball possession", value: 55 },
        ],
      },
      {
        team: { id: 2, name: "Away" },
        statistics: [
          { displayName: "Total shots", value: 7 },
          { displayName: "Ball possession", value: 45 },
        ],
      },
    ]);
    expect(bundle?.home.totalShots).toBe(10);
    expect(bundle?.away.totalShots).toBe(7);
    expect(bundle?.home.ballPossession).toBe(55);
    expect(bundle?.period).toBe("all");
  });
});
