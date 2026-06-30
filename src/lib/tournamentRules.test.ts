import { describe, expect, it } from "vitest";
import { ROUND_OF_32_FIXTURES } from "./brackets/getR32Slots";
import { GROUP_TIEBREAKER_STEPS, MATCH_POINTS, REGULATION_MINUTES } from "./tournamentRules";
import {
  validateKnockoutProgression,
  validateMatchResult,
  validateThirdPlaceAntiRematch,
} from "./tournamentValidation";
import type { BracketMatch } from "../types";

describe("tournamentRules", () => {
  it("exports constitutional constants from JSON", () => {
    expect(REGULATION_MINUTES).toBe(90);
    expect(MATCH_POINTS).toEqual({ win: 3, draw: 1, loss: 0 });
    expect(GROUP_TIEBREAKER_STEPS).toHaveLength(8);
  });
});

describe("validateThirdPlaceAntiRematch", () => {
  it("passes official R32 fixtures", () => {
    expect(validateThirdPlaceAntiRematch(ROUND_OF_32_FIXTURES)).toBeNull();
  });

  it("flags 1A vs 3A", () => {
    const violation = validateThirdPlaceAntiRematch([["M99", "1A", "3A"]]);
    expect(violation?.code).toBe("ANTI_REMATCH");
  });
});

describe("validateMatchResult", () => {
  it("flags unresolved knockout draws (ERR_003)", () => {
    const violation = validateMatchResult({
      id: "M76",
      matchId: "M76",
      status: "completed",
      homeScore: 1,
      awayScore: 1,
    });
    expect(violation?.code).toBe("ERR_003");
  });

  it("allows knockout draws resolved on penalties", () => {
    expect(
      validateMatchResult({
        id: "M76",
        matchId: "M76",
        status: "completed",
        homeScore: 1,
        awayScore: 1,
        decidedByPenalties: true,
        penaltyShootout: { homeScore: 4, awayScore: 3, homeKicks: [], awayKicks: [] },
      })
    ).toBeNull();
  });

  it("ignores group-stage draws", () => {
    expect(
      validateMatchResult({
        id: "g1",
        group: "A",
        status: "completed",
        homeScore: 0,
        awayScore: 0,
      })
    ).toBeNull();
  });
});

describe("validateKnockoutProgression", () => {
  it("flags losers appearing outside M103 (ERR_005)", () => {
    const bracket: BracketMatch[] = [
      {
        id: "M89",
        stage: "R16",
        homeTeamId: "fra",
        awayTeamId: "ger",
        source: "scheduled",
      },
    ];
    const violation = validateKnockoutProgression({ L74: "ger" }, bracket);
    expect(violation?.code).toBe("ERR_005");
  });

  it("allows semi-final losers on the M103 pathway", () => {
    const bracket: BracketMatch[] = [
      {
        id: "M103",
        stage: "ThirdPlace",
        homeTeamId: "fra",
        awayTeamId: "ger",
        source: "scheduled",
      },
    ];
    expect(validateKnockoutProgression({ L101: "fra", L102: "ger" }, bracket)).toBeNull();
  });
});
