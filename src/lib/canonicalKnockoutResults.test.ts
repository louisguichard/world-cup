import { describe, expect, it } from "vitest";
import { getCanonicalLockedKnockoutMatches } from "./canonicalKnockoutResults";
import { resolveMatchWinner } from "./resolveMatchWinner";

describe("canonicalKnockoutResults", () => {
  it("locks M75 Paraguay pen win and M76 Morocco pen win", () => {
    const canonical = getCanonicalLockedKnockoutMatches();
    expect(canonical.M75?.penaltyShootout).toEqual({ homeScore: 3, awayScore: 4, home: [], away: [] });
    expect(resolveMatchWinner(canonical.M75!)).toBe("par");
    expect(canonical.M76?.penaltyShootout).toEqual({ homeScore: 2, awayScore: 3, home: [], away: [] });
    expect(resolveMatchWinner(canonical.M76!)).toBe("mar");
  });
});
