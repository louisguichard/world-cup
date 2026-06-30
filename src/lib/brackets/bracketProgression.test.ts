import { describe, expect, it } from "vitest";
import {
  KNOCKOUT_ROUND_FIXTURES,
  R32_VISUAL_ORDER,
  validateR32FixtureSeeds,
} from "./bracketProgression";
import { ROUND_OF_32_FIXTURES } from "./getR32Slots";
import { BRACKET_FEED_MAP } from "../bracketTree";
import {
  finalFixtureFromJson,
  qfFixturesFromJson,
  r16FixturesFromJson,
  r32FixturesFromJson,
  sfFixturesFromJson,
  thirdPlaceFixtureFromJson,
} from "./knockoutBracketJson";

describe("bracketProgression", () => {
  it("has no duplicate R32 seed labels", () => {
    expect(validateR32FixtureSeeds()).toEqual([]);
  });

  it("matches world_cup_2026_knockout_bracket.json R32 seeds", () => {
    expect([...ROUND_OF_32_FIXTURES]).toEqual(r32FixturesFromJson());
  });

  it("matches official JSON R16 feeder wiring", () => {
    expect(KNOCKOUT_ROUND_FIXTURES.R16).toEqual(r16FixturesFromJson());
  });

  it("matches official JSON QF/SF/ThirdPlace/Final wiring", () => {
    expect(KNOCKOUT_ROUND_FIXTURES.QF).toEqual(qfFixturesFromJson());
    expect(KNOCKOUT_ROUND_FIXTURES.SF).toEqual(sfFixturesFromJson());
    expect(KNOCKOUT_ROUND_FIXTURES.ThirdPlace).toEqual([thirdPlaceFixtureFromJson()]);
    expect(KNOCKOUT_ROUND_FIXTURES.Final).toEqual([finalFixtureFromJson()]);
  });

  it("documents third-place match feeders from JSON", () => {
    expect(thirdPlaceFixtureFromJson()).toEqual(["M103", "L101", "L102"]);
  });

  it("places Germany/Paraguay on M76 (1E vs 3D)", () => {
    const m76 = ROUND_OF_32_FIXTURES.find(([id]) => id === "M76");
    expect(m76).toEqual(["M76", "1E", "3D"]);
    expect(KNOCKOUT_ROUND_FIXTURES.R16).toContainEqual(["M91", "W76", "W78"]);
  });

  it("places Brazil/Japan on M85 (1C vs 2F)", () => {
    const m85 = ROUND_OF_32_FIXTURES.find(([id]) => id === "M85");
    expect(m85).toEqual(["M85", "1C", "2F"]);
  });

  it("places each R16 feeder pair adjacent in R32 visual order", () => {
    for (const [, feeders] of Object.entries(BRACKET_FEED_MAP)) {
      if (!feeders) continue;
      const [a, b] = feeders;
      const ia = R32_VISUAL_ORDER.indexOf(a);
      const ib = R32_VISUAL_ORDER.indexOf(b);
      if (ia < 0 || ib < 0) continue;
      expect(Math.abs(ia - ib)).toBe(1);
    }
  });
});
