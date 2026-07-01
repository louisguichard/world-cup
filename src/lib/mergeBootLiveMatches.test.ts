import { describe, expect, it } from "vitest";
import type { MergedMatch, Team } from "../types";
import { mergeBootLiveMatches } from "./mergeBootLiveMatches";
import { normalizeLiveMatchStoreWithRegistry } from "./registry";

function makeTeam(id: string): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    group: "A",
    rating: 1500,
  };
}

describe("mergeBootLiveMatches", () => {
  const teams = {
    ger: makeTeam("ger"),
    par: makeTeam("par"),
    ned: makeTeam("ned"),
    mar: makeTeam("mar"),
    mex: makeTeam("mex"),
    ecu: makeTeam("ecu"),
  };
  const m76Kickoff = "2026-06-30T01:00:00Z";

  it("preserves locked completed cache row over unlocked boot rebuild", () => {
    const bootBuilt: Record<string, MergedMatch> = {
      M75: {
        id: "M75",
        matchId: "M75",
        espnEventId: "760489",
        date: "2026-06-29T23:00:00Z",
        homeTeamId: "ger",
        awayTeamId: "par",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    };

    const cached: Record<string, MergedMatch> = {
      M75: {
        id: "M75",
        matchId: "M75",
        espnEventId: "760489",
        date: "2026-06-29T23:00:00Z",
        homeTeamId: "ger",
        awayTeamId: "par",
        status: "completed",
        homeScore: 1,
        awayScore: 2,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn",
      },
    };

    const merged = mergeBootLiveMatches(bootBuilt, cached, teams);
    expect(merged.M75?.homeScore).toBe(1);
    expect(merged.M75?.awayScore).toBe(1);
    expect(merged.M75?.penaltyShootout).toEqual({ homeScore: 3, awayScore: 4, home: [], away: [] });
    expect(merged.M75?.locked).toBe(true);
  });

  it("does not apply unlocked cache rows", () => {
    const bootBuilt: Record<string, MergedMatch> = {
      M79: {
        id: "M79",
        matchId: "M79",
        espnEventId: "760491",
        date: "2026-06-30T03:00:00Z",
        homeTeamId: "mex",
        awayTeamId: "ecu",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    };

    const cached: Record<string, MergedMatch> = {
      M79: {
        ...bootBuilt.M79!,
        homeScore: 0,
        awayScore: 3,
        locked: false,
      },
    };

    const merged = mergeBootLiveMatches(bootBuilt, cached, teams);
    expect(merged.M79?.homeScore).toBe(2);
    expect(merged.M79?.awayScore).toBe(1);
  });

  it("normalizes boot merge through registry dedupe", () => {
    const bootBuilt: Record<string, MergedMatch> = {
      M76: {
        id: "M76",
        matchId: "M76",
        espnEventId: "760488",
        date: m76Kickoff,
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "live",
        homeScore: 1,
        awayScore: 0,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
      espnRow: {
        id: "espnRow",
        espnEventId: "760488",
        matchId: "M76",
        date: m76Kickoff,
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "live",
        homeScore: 1,
        awayScore: 0,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    };

    const merged = mergeBootLiveMatches(bootBuilt, {}, teams);
    expect(merged.M76).toBeDefined();
    expect(merged.M76?.homeTeamId).toBe("ned");
    expect(merged.M76?.awayTeamId).toBe("mar");
    expect(Object.keys(merged).filter((key) => merged[key]?.matchId === "M76")).toHaveLength(1);
    expect(normalizeLiveMatchStoreWithRegistry(bootBuilt, teams).M76?.matchId).toBe("M76");
  });
});
