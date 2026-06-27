import { describe, expect, it } from "vitest";
import {
  americanToImpliedPercent,
  buildMatchOddsSummary,
  explainAmericanOdds,
  explainTitleOddsPercent,
  formatAmericanOdds,
} from "./oddsDisplay";
import type { OddsSnapshot } from "../types";

const copy = {
  drawLabel: "Tie game",
  toAdvanceLabel: "N/A",
  favoriteLead: (team: string, pct: number) => `${team} is favorite at ${pct}%`,
  drawFavoriteLead: (pct: number) => `Draw is favorite at ${pct}%`,
  sourcePolymarket: "From Polymarket",
  sourceSportsbook: "From sportsbook",
  sourceGeneric: "From market",
};

describe("oddsDisplay", () => {
  it("converts American odds to implied percent", () => {
    expect(americanToImpliedPercent(-150)).toBeCloseTo(60, 0);
    expect(americanToImpliedPercent(200)).toBeCloseTo(33.33, 1);
  });

  it("formats American odds with sign", () => {
    expect(formatAmericanOdds(-120)).toBe("-120");
    expect(formatAmericanOdds(180)).toBe("+180");
    expect(formatAmericanOdds(null)).toBe("—");
  });

  it("explains American odds in plain language", () => {
    expect(explainAmericanOdds(-150)).toContain("$150");
    expect(explainAmericanOdds(200)).toContain("$200");
  });

  it("picks the favorite in a three-way market", () => {
    const odds: OddsSnapshot = {
      homeWin: -110,
      draw: 260,
      awayWin: 320,
      twoWay: false,
      source: "polymarket",
    };
    const summary = buildMatchOddsSummary(odds, "Brazil", "France", copy);
    expect(summary.favoriteTeam).toBe("Brazil");
    expect(summary.rows.find((r) => r.side === "home")?.isFavorite).toBe(true);
  });

  it("handles knockout two-way advance markets", () => {
    const odds: OddsSnapshot = {
      homeWin: -180,
      draw: 0,
      awayWin: 150,
      twoWay: true,
      source: "sportsbook",
    };
    const summary = buildMatchOddsSummary(odds, "Brazil", "France", copy);
    expect(summary.rows).toHaveLength(2);
    expect(summary.favoriteTeam).toBe("Brazil to advance");
    expect(summary.rows[0].teamLabel).toContain("Brazil to advance");
  });

  it("explains title odds in kid-friendly tiers", () => {
    expect(explainTitleOddsPercent(25)).toContain("strong favorite");
    expect(explainTitleOddsPercent(3)).toContain("long shot");
  });
});
