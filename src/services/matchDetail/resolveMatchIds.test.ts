import { describe, expect, it } from "vitest";
import type { MergedMatch } from "../../types";
import { resolveMatchIds, resolveOfficialIdFromEspn } from "./resolveMatchIds";

function makeMatch(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "test-id",
    date: "2026-06-14T18:00:00Z",
    homeTeamId: "USA",
    awayTeamId: "MEX",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
      source: "espn",
    ...overrides
  };
}

describe("resolveMatchIds", () => {
  it("resolves by matchId match in live store", () => {
    const liveMatches = {
      "abc123": makeMatch({
        id: "abc123",
        matchId: "M89",
        espnEventId: "espn-999",
        sofaEventId: "sofa-888"
      })
    };

    const result = resolveMatchIds("M89", liveMatches);
    expect(result.officialMatchId).toBe("M89");
    expect(result.espnEventId).toBe("espn-999");
    expect(result.sofaEventId).toBe("sofa-888");
    expect(result.wcMatchId).toBe("M89");
  });

  it("resolves by id when matchId not set", () => {
    const liveMatches = {
      "M10": makeMatch({
        id: "M10",
        espnEventId: "espn-42"
      })
    };

    const result = resolveMatchIds("M10", liveMatches);
    expect(result.officialMatchId).toBe("M10");
    expect(result.espnEventId).toBe("espn-42");
  });

  it("returns nulls for unknown match not in store", () => {
    const result = resolveMatchIds("M999", {});
    expect(result.officialMatchId).toBe("M999");
    expect(result.espnEventId).toBeNull();
    expect(result.wcMatchId).toBeNull();
  });
});

describe("resolveOfficialIdFromEspn", () => {
  it("finds official id by espnEventId", () => {
    const liveMatches = {
      "abc": makeMatch({ id: "abc", matchId: "M50", espnEventId: "espn-50" })
    };
    expect(resolveOfficialIdFromEspn("espn-50", liveMatches)).toBe("M50");
  });

  it("returns null when not found", () => {
    expect(resolveOfficialIdFromEspn("espn-missing", {})).toBeNull();
  });
});
