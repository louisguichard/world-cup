import { describe, expect, it } from "vitest";
import { buildBracketViewModel } from "./buildBracketViewModel";
import type { Match, MergedMatch, Team } from "../../types";

function team(id: string): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    group: "A",
    rating: 1500,
  };
}

describe("buildBracketViewModel", () => {
  const qualContext = {
    lockedGroupMatchCount: {},
    lockedStandingsByGroup: {},
  };

  it("uses live knockout context for confirmed live mode", () => {
    const liveMatches: Record<string, MergedMatch> = {
      M76: {
        id: "M76",
        matchId: "M76",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: false,
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        source: "espn",
      },
    };

    const tab = buildBracketViewModel({
      mode: "confirmed",
      context: "tab",
      teams: [team("ned"), team("mar")],
      matches: [] as Match[],
      liveMatches,
      qualContext,
    });

    const live = buildBracketViewModel({
      mode: "confirmed",
      context: "live",
      teams: [team("ned"), team("mar")],
      matches: [] as Match[],
      liveMatches,
      qualContext,
    });

    expect(tab.fingerprint).not.toBe(live.fingerprint);
    expect(live.bracket.length).toBeGreaterThan(0);
  });

  it("returns projected bracket in projected mode", () => {
    const result = buildBracketViewModel({
      mode: "projected",
      context: "tab",
      teams: [team("usa"), team("mex")],
      matches: [] as Match[],
      liveMatches: {},
      qualContext,
      mergedSchedule: [],
      knockoutMarkets: [],
      scoreOverrides: {},
    });

    expect(result.bracket.length).toBeGreaterThan(0);
    expect(result.standings.length).toBeGreaterThan(0);
  });
});
