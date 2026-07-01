import { describe, expect, it } from "vitest";
import type { MergedMatch, Team } from "../types";
import {
  buildCompletedResultsViewModel,
  buildRecentResultsSections,
  listCanonicalCompletedMatches,
  matchResultStableId,
} from "./buildCompletedResultsViewModel";

function makeTeam(id: string, abbrev: string): Team {
  return {
    id,
    name: id,
    shortName: abbrev,
    abbreviation: abbrev,
    group: "F",
    rating: 80,
  };
}

const teams: Record<string, Team> = {
  ned: makeTeam("ned", "NED"),
  mar: makeTeam("mar", "MAR"),
};

function lockedMoroccoWin(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "M86",
    matchId: "M86",
    espnEventId: "760488",
    homeTeamId: "ned",
    awayTeamId: "mar",
    date: "2026-06-30T19:00:00Z",
    status: "completed",
    locked: true,
    source: "espn",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 2, awayScore: 3 },
    homeConduct: 0,
    awayConduct: 0,
    ...overrides,
  };
}

describe("buildCompletedResultsViewModel", () => {
  it("dedupes ESPN and official rows to one locked knockout result", () => {
    const liveMatches: Record<string, MergedMatch> = {
      M86: lockedMoroccoWin(),
      espn760488: {
        id: "760488",
        espnEventId: "760488",
        homeTeamId: "ned",
        awayTeamId: "mar",
        date: "2026-06-30T19:00:00Z",
        status: "completed",
        locked: false,
        source: "espn",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
      },
    };

    const canonical = listCanonicalCompletedMatches(liveMatches, teams);
    const m76Rows = canonical.filter((match) => matchResultStableId(match) === "M76");
    expect(m76Rows).toHaveLength(1);
    expect(m76Rows[0]?.penaltyShootout).toMatchObject({ homeScore: 2, awayScore: 3 });
    expect(m76Rows[0]?.locked).toBe(true);
  });

  it("returns the same ordered ids for Live recent and Results tab defaults", () => {
    const liveMatches: Record<string, MergedMatch> = {
      M86: lockedMoroccoWin(),
      M76: lockedMoroccoWin({
        id: "M76",
        matchId: "M76",
        homeTeamId: "ger",
        awayTeamId: "par",
        date: "2026-06-30T01:00:00Z",
      }),
    };

    const recentList = buildCompletedResultsViewModel(liveMatches, teams, { sort: "recent" });
    const resultsList = buildCompletedResultsViewModel(liveMatches, teams, {
      sort: "recent",
      filters: { sort: "recent", stage: "all", group: "all", search: "" },
    });

    expect(recentList.map(matchResultStableId)).toEqual(resultsList.map(matchResultStableId));
    expect(recentList.map((m) => m.homeScore)).toEqual(resultsList.map((m) => m.homeScore));
  });

  it("buildRecentResultsSections caps visible rows but reports full total", () => {
    const completed = buildCompletedResultsViewModel(
      {
        M86: lockedMoroccoWin({ date: "2026-06-30T19:00:00Z" }),
      },
      teams,
      { sort: "recent" }
    );

    const { sections, total } = buildRecentResultsSections(completed, {
      maxTotal: 1,
      isKnockoutActive: true,
      now: new Date("2026-07-03T20:00:00Z"),
      labels: { today: "Today", yesterday: "Yesterday", earlierKnockout: "Earlier" },
    });

    expect(total).toBe(completed.length);
    expect(total).toBeGreaterThanOrEqual(6);
    expect(sections.flatMap((section) => section.matches)).toHaveLength(1);
  });
});
