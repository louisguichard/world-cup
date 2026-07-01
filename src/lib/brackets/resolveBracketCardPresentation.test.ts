import { describe, expect, it } from "vitest";
import { resolveBracketCardPresentation } from "./resolveBracketCardPresentation";
import type { BracketMatch, MergedMatch, Team } from "../../types";

const teams: Record<string, Team> = {
  ger: { id: "ger", name: "Germany", abbr: "GER", group: "E" },
  par: { id: "par", name: "Paraguay", abbr: "PAR", group: "D" },
};

const baseMatch: BracketMatch = {
  id: "M75",
  stage: "R32",
  label: "M75",
  homeTeamId: "ger",
  awayTeamId: "par",
  homeSeedLabel: "1E",
  awaySeedLabel: "3D",
  homeScore: 1,
  awayScore: 1,
  winnerTeamId: "par",
  source: "scheduled",
  homeCertainty: "confirmed",
  awayCertainty: "confirmed",
  homeGhosts: [],
  awayGhosts: [],
  penaltyShootout: { homeScore: 3, awayScore: 4 },
};

describe("resolveBracketCardPresentation", () => {
  it("uses locked bracket scores over stale unlocked ESPN poll", () => {
    const staleEspn: MergedMatch = {
      id: "espn-75",
      matchId: "M75",
      status: "completed",
      homeTeamId: "ger",
      awayTeamId: "par",
      homeScore: 2,
      awayScore: 1,
      locked: false,
    } as MergedMatch;

    const result = resolveBracketCardPresentation(baseMatch, staleEspn, teams);
    expect(result.scoreHome).toBe(1);
    expect(result.scoreAway).toBe(1);
    expect(result.penaltyShootout).toEqual({ homeScore: 3, awayScore: 4 });
    expect(result.winnerTeamId).toBe("par");
  });

  it("marks Paraguay winner on penalties when scores are level", () => {
    const result = resolveBracketCardPresentation(baseMatch, undefined, teams);
    expect(result.winnerTeamId).toBe("par");
  });

  it("prefers locked live over bracket slot", () => {
    const locked: MergedMatch = {
      id: "M75",
      matchId: "M75",
      status: "completed",
      locked: true,
      homeTeamId: "ger",
      awayTeamId: "par",
      homeScore: 1,
      awayScore: 1,
      penaltyShootout: { homeScore: 3, awayScore: 4 },
    } as MergedMatch;

    const result = resolveBracketCardPresentation(baseMatch, locked, teams);
    expect(result.winnerTeamId).toBe("par");
    expect(result.scoreHome).toBe(1);
  });
});
