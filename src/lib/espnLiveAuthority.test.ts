import { describe, expect, it } from "vitest";
import type { Match, MergedMatch, Team } from "../types";
import { reconcileEspnLiveAuthority } from "./espnLiveAuthority";

const teams: Record<string, Team> = {
  ger: { id: "ger", name: "Germany", shortName: "Germany", abbreviation: "GER", group: "A" },
  par: { id: "par", name: "Paraguay", shortName: "Paraguay", abbreviation: "PAR", group: "B" },
  fra: { id: "fra", name: "France", shortName: "France", abbreviation: "FRA", group: "I" },
  swe: { id: "swe", name: "Sweden", shortName: "Sweden", abbreviation: "SWE", group: "F" },
};

function storeMatch(overrides: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    date: "2026-06-30T17:00:00-04:00",
    homeTeamId: "fra",
    awayTeamId: "swe",
    status: "live",
    homeScore: 0,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    dataSource: "espn",
    clockMinute: 0,
    displayClock: "0'",
    espnEventId: "espn-phantom",
    matchId: "M77",
    ...overrides,
  };
}

function espnRow(overrides: Partial<Match> & Pick<Match, "id">): Match {
  return {
    date: "2026-06-30T17:00:00-04:00",
    homeTeamId: "fra",
    awayTeamId: "swe",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    ...overrides,
  };
}

describe("reconcileEspnLiveAuthority", () => {
  it("demotes phantom live when ESPN still lists scheduled", () => {
    const merged: Record<string, MergedMatch> = {
      M77: storeMatch({ id: "M77" }),
    };
    const demoted = reconcileEspnLiveAuthority(merged, [espnRow({ id: "espn-phantom" })], teams);
    expect(demoted).toEqual(["M77"]);
    expect(merged.M77.status).toBe("scheduled");
    expect(merged.M77.clockMinute).toBeUndefined();
    expect(merged.M77.homeScore).toBeUndefined();
  });

  it("keeps ESPN-confirmed live matches", () => {
    const merged: Record<string, MergedMatch> = {
      M76: storeMatch({
        id: "M76",
        matchId: "M76",
        homeTeamId: "ger",
        awayTeamId: "par",
        espnEventId: "espn-live",
        clockMinute: 34,
        date: "2026-06-11T19:00:00.000Z",
      }),
    };
    const kickoff = Date.parse("2026-06-11T19:00:00.000Z");
    const now = kickoff + 34 * 60 * 1000;
    const demoted = reconcileEspnLiveAuthority(
      merged,
      [espnRow({ id: "espn-live", homeTeamId: "ger", awayTeamId: "par", status: "live", homeScore: 1, awayScore: 0 })],
      teams,
      now
    );
    expect(demoted).toEqual([]);
    expect(merged.M76.status).toBe("live");
    expect(merged.M76.clockMinute).toBe(34);
  });

  it("demotes premature live even when ESPN lists live before kickoff", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const now = kickoff - 32 * 60 * 1000;
    const merged: Record<string, MergedMatch> = {
      M77: storeMatch({
        id: "M77",
        date: "2026-06-30T18:00:00.000Z",
        espnEventId: "espn-early",
      }),
    };
    const demoted = reconcileEspnLiveAuthority(
      merged,
      [espnRow({ id: "espn-early", status: "live", homeScore: 0, awayScore: 0 })],
      teams,
      now
    );
    expect(demoted).toEqual(["M77"]);
    expect(merged.M77.status).toBe("scheduled");
  });
});
