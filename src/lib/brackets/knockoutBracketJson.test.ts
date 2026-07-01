import { describe, expect, it } from "vitest";
import { parseBracketSeedLabel, r32FixturesFromJson } from "./knockoutBracketJson";

describe("knockoutBracketJson", () => {
  it("parses seed labels with team name suffixes", () => {
    expect(parseBracketSeedLabel("1A (Mexico)")).toBe("1A");
    expect(parseBracketSeedLabel("3E (Ecuador)")).toBe("3E");
    expect(parseBracketSeedLabel("2B (Canada)")).toBe("2B");
  });

  it("loads 16 R32 fixtures from official JSON (FIFA schedule M73 = 2A vs 2B)", () => {
    const fixtures = r32FixturesFromJson();
    expect(fixtures).toHaveLength(16);
    expect(fixtures[0]).toEqual(["M73", "2A", "2B"]);
    expect(fixtures.find(([id]) => id === "M79")).toEqual(["M79", "1A", "3E"]);
    expect(fixtures.find(([id]) => id === "M74")).toEqual(["M74", "1C", "2F"]);
  });
});
