import { describe, expect, it } from "vitest";
import { resolveEspnMergeTarget, mergeEspnMatchIntoStore } from "./espnMatchMerge";
import type { MergedMatch } from "../types";

function makeMatch(id: string, overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id,
    date: "2026-07-04T20:00:00Z",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    ...overrides
  };
}

describe("resolveEspnMergeTarget", () => {
  it("returns id mode when exact key match exists", () => {
    const merged = { "776459": makeMatch("776459") };
    const incoming = makeMatch("776459");
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result).toEqual({ storeKey: "776459", mode: "id" });
  });

  it("returns fuzzy mode when store entry has espnEventId pointer", () => {
    const merged = {
      "M89": makeMatch("M89", { espnEventId: "776459", matchId: "M89" })
    };
    const incoming = makeMatch("776459");
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result).toEqual({ storeKey: "M89", mode: "fuzzy" });
  });

  it("returns fuzzy mode on same teams + close kickoff", () => {
    const merged = {
      "M89": makeMatch("M89", {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        date: "2026-07-04T20:00:00Z"
      })
    };
    const incoming = makeMatch("776459", {
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      date: "2026-07-04T20:05:00Z"
    });
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result).toEqual({ storeKey: "M89", mode: "fuzzy" });
  });

  it("returns new mode when no existing match found", () => {
    const merged = {};
    const incoming = makeMatch("776459");
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result).toEqual({ storeKey: "776459", mode: "new" });
  });

  it("does not fuzzy-match different teams", () => {
    const merged = {
      "M89": makeMatch("M89", { homeTeamId: "team-x", awayTeamId: "team-y" })
    };
    const incoming = makeMatch("776459", { homeTeamId: "team-a", awayTeamId: "team-b" });
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result.mode).toBe("new");
  });

  it("does not fuzzy-match when kickoff is more than 4 hours apart", () => {
    const merged = {
      "M89": makeMatch("M89", {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        date: "2026-07-04T10:00:00Z"
      })
    };
    const incoming = makeMatch("776459", {
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      date: "2026-07-04T20:00:00Z"
    });
    const result = resolveEspnMergeTarget(merged, incoming);
    expect(result.mode).toBe("new");
  });
});

describe("mergeEspnMatchIntoStore", () => {
  it("updates the M89 store key on fuzzy match, preserves matchId", () => {
    const merged: Record<string, MergedMatch> = {
      "M89": makeMatch("M89", { matchId: "M89", espnEventId: "776459" })
    };
    const incoming = makeMatch("776459", { status: "live", homeScore: 1, awayScore: 0 });
    const mode = mergeEspnMatchIntoStore(merged, incoming, {});
    expect(mode).toBe("fuzzy");
    expect(merged["M89"]).toBeDefined();
    expect(merged["M89"]?.status).toBe("live");
    expect(merged["M89"]?.homeScore).toBe(1);
    expect(merged["776459"]).toBeUndefined();
  });

  it("inserts a new entry for genuinely new matches", () => {
    const merged: Record<string, MergedMatch> = {};
    const incoming = makeMatch("999888", { status: "scheduled" });
    const mode = mergeEspnMatchIntoStore(merged, incoming, {});
    expect(mode).toBe("new");
    expect(merged["999888"]).toBeDefined();
  });
});
