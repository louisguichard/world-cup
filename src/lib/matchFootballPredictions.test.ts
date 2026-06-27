import { describe, expect, it } from "vitest";
import {
  formatPredictionPick,
  linkPredictionToMatch,
  predictionTeamMatchesTeam,
} from "./matchFootballPredictions";
import type { MergedMatch, Team } from "../types";

const brazil: Team = {
  id: "bra",
  name: "Brazil",
  shortName: "Brazil",
  abbreviation: "BRA",
  group: "D",
  rating: 2000,
};

const france: Team = {
  id: "fra",
  name: "France",
  shortName: "France",
  abbreviation: "FRA",
  group: "E",
  rating: 1990,
};

describe("matchFootballPredictions", () => {
  it("matches team names with aliases", () => {
    expect(predictionTeamMatchesTeam("Brazil", brazil)).toBe(true);
    expect(predictionTeamMatchesTeam("United States", { ...brazil, id: "usa", name: "United States", abbreviation: "USA" })).toBe(true);
  });

  it("links prediction to schedule match", () => {
    const match: MergedMatch = {
      id: "m1",
      date: "2026-06-27T18:00:00.000Z",
      homeTeamId: "bra",
      awayTeamId: "fra",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    const linked = linkPredictionToMatch(
      {
        id: "p1",
        homeTeam: "Brazil",
        awayTeam: "France",
        date: "2026-06-27",
        leagueId: "16",
        prediction: "1",
        isFinished: false,
      },
      match,
      { bra: brazil, fra: france }
    );
    expect(linked).toBe(true);
  });

  it("formats prediction picks", () => {
    expect(formatPredictionPick("X")).toBe("Draw");
    expect(formatPredictionPick("1")).toBe("Home win");
  });
});
