import { describe, expect, it } from "vitest";
import { buildBracketDatasetFingerprint } from "./bracketSelectors";
import type { MergedMatch } from "../../types";

function match(overrides: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    id: overrides.id,
    matchId: overrides.matchId ?? overrides.id,
    homeTeamId: "a",
    awayTeamId: "b",
    date: "2026-06-15",
    status: "scheduled",
    locked: false,
    source: "espn",
    ...overrides,
  };
}

describe("buildBracketDatasetFingerprint", () => {
  it("ignores group-stage updates in confirmed mode", () => {
    const base = {
      g1: match({ id: "g1", group: "A", homeScore: 0, awayScore: 0 }),
      m73: match({ id: "M73", homeScore: 1, awayScore: 0, status: "completed", locked: true }),
    };
    const fp1 = buildBracketDatasetFingerprint(base, "confirmed");
    const fp2 = buildBracketDatasetFingerprint(
      { ...base, g1: match({ id: "g1", group: "A", homeScore: 1, awayScore: 0 }) },
      "confirmed"
    );
    expect(fp1).toBe(fp2);
  });

  it("includes group-stage updates in projected mode", () => {
    const base = {
      g1: match({ id: "g1", group: "A", homeScore: 0, awayScore: 0 }),
    };
    const fp1 = buildBracketDatasetFingerprint(base, "projected");
    const fp2 = buildBracketDatasetFingerprint(
      { g1: match({ id: "g1", group: "A", homeScore: 1, awayScore: 0 }) },
      "projected"
    );
    expect(fp1).not.toBe(fp2);
  });
});
