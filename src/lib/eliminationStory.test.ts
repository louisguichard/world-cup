import { describe, expect, it } from "vitest";
import { buildEliminationStory } from "./eliminationStory";
import type { GroupStanding, Team } from "../types";

const team: Team = {
  id: "t1",
  name: "Testland",
  abbreviation: "TST",
  group: "A",
  fifaRank: 20,
  confederation: "UEFA",
  rating: 1600,
};

const standings: GroupStanding[] = [
  {
    group: "A",
    rows: [
      {
        teamId: "t1",
        group: "A",
        played: 3,
        wins: 0,
        draws: 1,
        losses: 2,
        goalsFor: 2,
        goalsAgainst: 5,
        goalDifference: -3,
        points: 1,
        conduct: 0,
        rating: 1600,
        fifaRank: 20,
      },
    ],
  },
];

describe("buildEliminationStory", () => {
  it("returns null for teams still alive", () => {
    expect(
      buildEliminationStory({
        teamId: "t1",
        team,
        matches: [],
        teams: [team],
        matchEvents: {},
        standings,
        qualContext: { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} },
      })
    ).toBeNull();
  });
});
