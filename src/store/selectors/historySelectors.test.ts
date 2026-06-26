import { describe, expect, it } from "vitest";
import { compareMatchByKickoff, filterCompletedMatches } from "./historySelectors";
import type { MergedMatch } from "../../types";

function match(id: string, date: string, home = "a", away = "b"): MergedMatch {
  return {
    id,
    date,
    homeTeamId: home,
    awayTeamId: away,
    status: "completed",
    group: "A",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn"
  };
}

describe("historySelectors", () => {
  it("sorts newest kickoff first by default", () => {
    const list = [match("1", "2026-06-10T18:00:00Z"), match("2", "2026-06-15T18:00:00Z")];
    const out = filterCompletedMatches(list, { sort: "newest", limit: 10 });
    expect(out.map((m) => m.id)).toEqual(["2", "1"]);
  });

  it("filters by team and respects oldest sort", () => {
    const list = [
      match("1", "2026-06-10T18:00:00Z", "bra", "usa"),
      match("2", "2026-06-15T18:00:00Z", "bra", "mex"),
      match("3", "2026-06-12T18:00:00Z", "fra", "ger")
    ];
    const out = filterCompletedMatches(list, { teamId: "bra", sort: "oldest", limit: 10 });
    expect(out.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("compareMatchByKickoff is order-aware", () => {
    const a = match("a", "2026-06-20T18:00:00Z");
    const b = match("b", "2026-06-10T18:00:00Z");
    expect(compareMatchByKickoff(a, b, "newest")).toBeLessThan(0);
    expect(compareMatchByKickoff(a, b, "oldest")).toBeGreaterThan(0);
  });
});
