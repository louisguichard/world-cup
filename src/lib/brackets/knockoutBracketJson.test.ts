import { describe, expect, it } from "vitest";
import { parseBracketSeedLabel, r32FixturesFromJson } from "./knockoutBracketJson";

describe("knockoutBracketJson", () => {
  it("parses seed labels with team name suffixes", () => {
    expect(parseBracketSeedLabel("1A (Mexico)")).toBe("1A");
    expect(parseBracketSeedLabel("3E (Ecuador)")).toBe("3E");
    expect(parseBracketSeedLabel("2B (Canada)")).toBe("2B");
  });

  it("loads 16 R32 fixtures from official JSON", () => {
    const fixtures = r32FixturesFromJson();
    expect(fixtures).toHaveLength(16);
    expect(fixtures[0]).toEqual(["M73", "1A", "3E"]);
    expect(fixtures[12]).toEqual(["M85", "1C", "2F"]);
  });
});
