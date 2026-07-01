import { describe, expect, it } from "vitest";
import { buildFixtureRegistry } from "../registry/buildFixtureRegistry";
import { ROUND_OF_32_FIXTURES } from "./getR32Slots";
import { KNOCKOUT_ROUND_FIXTURES } from "./knockoutRoundFixtures";
import { LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID } from "./scheduleKnockoutCrosswalk";
import { r16FixturesFromJson, r32FixturesFromJson } from "./knockoutBracketJson";

/** Completed R32 results (June 30 2026) — team pairs keyed by FIFA schedule M##. */
const COMPLETED_R32_BY_SCHEDULE_ID: Record<
  string,
  {
    espnEventId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    penaltyShootout?: { homeScore: number; awayScore: number };
  }
> = {
  M73: { espnEventId: "760486", homeTeamId: "rsa", awayTeamId: "can", homeScore: 0, awayScore: 1 },
  M74: { espnEventId: "760487", homeTeamId: "bra", awayTeamId: "jpn", homeScore: 2, awayScore: 1 },
  M75: {
    espnEventId: "760489",
    homeTeamId: "ger",
    awayTeamId: "par",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 3, awayScore: 4 },
  },
  M76: {
    espnEventId: "760488",
    homeTeamId: "ned",
    awayTeamId: "mar",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 2, awayScore: 3 },
  },
  M77: { espnEventId: "760490", homeTeamId: "civ", awayTeamId: "nor", homeScore: 1, awayScore: 2 },
  M78: { espnEventId: "760492", homeTeamId: "fra", awayTeamId: "swe", homeScore: 3, awayScore: 0 },
};

describe("scheduleKnockoutAlignment", () => {
  const registry = buildFixtureRegistry();

  it("ROUND_OF_32_FIXTURES matches rebased bracket JSON", () => {
    expect([...ROUND_OF_32_FIXTURES]).toEqual(r32FixturesFromJson());
  });

  it("R16 feeders match FIFA schedule placeholders (W73 vs W74 … W87 vs W88)", () => {
    expect(KNOCKOUT_ROUND_FIXTURES.R16).toEqual(r16FixturesFromJson());
    expect(KNOCKOUT_ROUND_FIXTURES.R16).toEqual([
      ["M89", "W73", "W74"],
      ["M90", "W75", "W76"],
      ["M91", "W77", "W78"],
      ["M92", "W79", "W80"],
      ["M93", "W81", "W82"],
      ["M94", "W83", "W84"],
      ["M95", "W85", "W86"],
      ["M96", "W87", "W88"],
    ]);
  });

  it("maps legacy bracket M81 (2A vs 2B) to schedule M73", () => {
    expect(LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID.M81).toBe("M73");
  });

  it("registers ESPN event ids on schedule canonical M## ids", () => {
    for (const [matchId, expected] of Object.entries(COMPLETED_R32_BY_SCHEDULE_ID)) {
      const fixture = registry.byMatchId.get(matchId);
      expect(fixture?.espnEventId).toBe(expected.espnEventId);
    }
  });

  it("places completed R32 seed pairings on schedule match numbers", () => {
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M73")).toEqual(["M73", "2A", "2B"]);
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M74")).toEqual(["M74", "1C", "2F"]);
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M75")).toEqual(["M75", "1E", "3D"]);
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M76")).toEqual(["M76", "1F", "3C"]);
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M77")).toEqual(["M77", "2E", "2I"]);
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M78")).toEqual(["M78", "1I", "3F"]);
  });

  it("routes M76 winner to R16 M90 (not legacy M91 path)", () => {
    const r16 = KNOCKOUT_ROUND_FIXTURES.R16.find(([id]) => id === "M90");
    expect(r16).toEqual(["M90", "W75", "W76"]);
  });
});

describe("scheduleKnockoutCrosswalk", () => {
  it("maps every legacy R32 id to a distinct schedule id", () => {
    const targets = Object.values(LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID);
    expect(new Set(targets).size).toBe(16);
    expect(targets.every((id) => /^M(7[3-9]|8[0-8])$/.test(id))).toBe(true);
  });
});
