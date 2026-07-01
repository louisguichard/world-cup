import { describe, expect, it } from "vitest";
import {
  BRACKET_FEED_MAP,
  findChildBracketMatchId,
  seedLabelToMatchId,
  siblingFeederMatchId,
} from "./bracketTree";

describe("BRACKET_FEED_MAP — source of truth enforcement", () => {
  it("marks all R32 matches (M73-M88) as null feeders", () => {
    for (let n = 73; n <= 88; n += 1) {
      expect(BRACKET_FEED_MAP[`M${n}`]).toBeNull();
    }
  });

  it("M89 feeds from M73 and M74", () => {
    expect(BRACKET_FEED_MAP.M89).toEqual(["M73", "M74"]);
  });
  it("M90 feeds from M75 and M76", () => {
    expect(BRACKET_FEED_MAP.M90).toEqual(["M75", "M76"]);
  });
  it("M91 feeds from M77 and M78", () => {
    expect(BRACKET_FEED_MAP.M91).toEqual(["M77", "M78"]);
  });
  it("M92 feeds from M79 and M80", () => {
    expect(BRACKET_FEED_MAP.M92).toEqual(["M79", "M80"]);
  });
  it("M93 feeds from M81 and M82", () => {
    expect(BRACKET_FEED_MAP.M93).toEqual(["M81", "M82"]);
  });
  it("M94 feeds from M83 and M84", () => {
    expect(BRACKET_FEED_MAP.M94).toEqual(["M83", "M84"]);
  });
  it("M95 feeds from M85 and M86", () => {
    expect(BRACKET_FEED_MAP.M95).toEqual(["M85", "M86"]);
  });
  it("M96 feeds from M87 and M88", () => {
    expect(BRACKET_FEED_MAP.M96).toEqual(["M87", "M88"]);
  });

  it("M97 feeds from M89 and M90", () => {
    expect(BRACKET_FEED_MAP.M97).toEqual(["M89", "M90"]);
  });
  it("M101 feeds from M97 and M98", () => {
    expect(BRACKET_FEED_MAP.M101).toEqual(["M97", "M98"]);
  });
  it("M104 (Final) feeds from M101 and M102", () => {
    expect(BRACKET_FEED_MAP.M104).toEqual(["M101", "M102"]);
  });

  it("findChildBracketMatchId: M73 leads to R16 M89", () => {
    expect(findChildBracketMatchId("M73")).toBe("M89");
  });
  it("findChildBracketMatchId: M75 leads to R16 M90", () => {
    expect(findChildBracketMatchId("M75")).toBe("M90");
  });
  it("findChildBracketMatchId: M102 advances to Final M104 not third-place M103", () => {
    expect(findChildBracketMatchId("M102")).toBe("M104");
  });
  it("seedLabelToMatchId converts W74 → M74", () => {
    expect(seedLabelToMatchId("W74")).toBe("M74");
  });
  it("seedLabelToMatchId converts L101 → M101", () => {
    expect(seedLabelToMatchId("L101")).toBe("M101");
  });
  it("siblingFeederMatchId: sibling of M73 in M89 is M74", () => {
    expect(siblingFeederMatchId("M89", "M73")).toBe("M74");
  });
  it("siblingFeederMatchId: sibling of M75 in M90 is M76", () => {
    expect(siblingFeederMatchId("M90", "M75")).toBe("M76");
  });
  it("siblingFeederMatchId: returns undefined when feeder is not in child", () => {
    expect(siblingFeederMatchId("M91", "M73")).toBeUndefined();
  });
});
