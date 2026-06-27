import { describe, expect, it } from "vitest";
import { WC2026_TEAM_NAMES } from "../data/wc2026TeamCatalog";
import { loadStaticFifaRankings, staticFifaRankingsCount, staticFifaRankingsMeta } from "./loadStaticFifaRankings";
import { normalizeName } from "./normalize";

describe("loadStaticFifaRankings", () => {
  it("loads all 211 FIFA associations", () => {
    expect(staticFifaRankingsCount()).toBe(211);
  });

  it("uses the 11 June 2026 pre-tournament edition", () => {
    expect(staticFifaRankingsMeta().edition).toBe("2026-06-11");
  });

  it("maps top teams with official points", () => {
    const rankings = loadStaticFifaRankings();
    expect(rankings[normalizeName("Argentina")]).toEqual({ rank: 1, points: 1877.27 });
    expect(rankings[normalizeName("Spain")]).toEqual({ rank: 2, points: 1874.71 });
    expect(rankings[normalizeName("France")]).toEqual({ rank: 3, points: 1870.7 });
  });

  it("resolves USA to unitedstates key", () => {
    const rankings = loadStaticFifaRankings();
    expect(rankings.unitedstates).toEqual({ rank: 17, points: 1671.23 });
  });

  it("covers all 48 World Cup 2026 teams", () => {
    const rankings = loadStaticFifaRankings();
    const missing: string[] = [];
    for (const [abbrev, name] of Object.entries(WC2026_TEAM_NAMES)) {
      const key = normalizeName(name);
      if (abbrev === "USA") {
        if (!rankings.unitedstates) missing.push(name);
      } else if (!rankings[key]) {
        missing.push(name);
      }
    }
    expect(missing).toEqual([]);
  });
});
