import { describe, expect, it } from "vitest";
import {
  BRACKET_FEED_MAP,
  findChildBracketMatchId,
  seedLabelToMatchId,
  siblingFeederMatchId,
} from "./bracketTree";

describe("bracketTree", () => {
  it("maps R16 M90 to feeders M73 and M75", () => {
    expect(BRACKET_FEED_MAP.M90).toEqual(["M73", "M75"]);
  });

  it("maps R16 M89 to feeders M74 and M77", () => {
    expect(BRACKET_FEED_MAP.M89).toEqual(["M74", "M77"]);
    expect(findChildBracketMatchId("M74")).toBe("M89");
  });

  it("marks R32 matches as null feeders", () => {
    expect(BRACKET_FEED_MAP.M73).toBeNull();
    expect(BRACKET_FEED_MAP.M88).toBeNull();
  });

  it("converts winner seed labels to match ids", () => {
    expect(seedLabelToMatchId("W74")).toBe("M74");
  });

  it("finds child match for a feeder", () => {
    expect(findChildBracketMatchId("M73")).toBe("M90");
    expect(findChildBracketMatchId("M75")).toBe("M90");
  });

  it("finds sibling feeder within the same R16 slot", () => {
    expect(siblingFeederMatchId("M90", "M73")).toBe("M75");
    expect(siblingFeederMatchId("M90", "M75")).toBe("M73");
  });
});
