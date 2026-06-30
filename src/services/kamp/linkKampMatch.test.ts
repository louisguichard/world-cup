import { describe, expect, it } from "vitest";
import { buildCatalogTeam } from "../../data/wc2026TeamCatalog";
import { linkKampMatchToStore } from "./linkKampMatch";
import type { KampMatchRecord } from "../../schemas/kampMatches";
import type { MergedMatch } from "../../types";

const mexicoOpening: KampMatchRecord = {
  date: "2026-06-11",
  fase: "Fase de Grupos",
  time: "12:00",
  team_1: "México",
  team_2: "África do Sul",
  score_1: 2,
  score_2: 0,
  gols: [{ team: "MEX", player: "Julián Quiñones", minute: 8 }],
  highlights_url: "https://www.youtube.com/results?search_query=mex-rsa",
};

function storeMatch(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "mex-rsa-1",
    matchId: "M1",
    date: "2026-06-11T18:00:00.000Z",
    homeTeamId: "mex",
    awayTeamId: "rsa",
    status: "completed",
    homeScore: 2,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: true,
    source: "espn",
    ...overrides,
  };
}

describe("linkKampMatchToStore", () => {
  const teams = {
    mex: buildCatalogTeam("MEX", "A"),
    rsa: buildCatalogTeam("RSA", "A"),
  };

  it("links opening match by Portuguese names and date", () => {
    const merged = { "mex-rsa-1": storeMatch() };
    const linked = linkKampMatchToStore(mexicoOpening, merged, teams);
    expect(linked?.storeMatchId).toBe("mex-rsa-1");
    expect(linked?.kamp.highlights_url).toContain("youtube.com");
  });

  it("rejects completed store match when scores disagree", () => {
    const merged = { "mex-rsa-1": storeMatch({ homeScore: 1, awayScore: 0 }) };
    const linked = linkKampMatchToStore(mexicoOpening, merged, teams);
    expect(linked).toBeNull();
  });
});
