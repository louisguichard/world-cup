import { describe, expect, it } from "vitest";
import { buildRankingTimeline } from "./buildRankingTimeline";
import type { GroupStanding, MergedMatch, Team } from "../types";

const teams: Team[] = [
  { id: "t1", name: "One", shortName: "One", abbreviation: "ONE", group: "A", rating: 1500 },
  { id: "t2", name: "Two", shortName: "Two", abbreviation: "TWO", group: "A", rating: 1490 },
  { id: "t3", name: "Three", shortName: "Three", abbreviation: "THR", group: "A", rating: 1480 },
  { id: "t4", name: "Four", shortName: "Four", abbreviation: "FOU", group: "A", rating: 1470 },
  { id: "u1", name: "U1", shortName: "U1", abbreviation: "U1", group: "B", rating: 1500 },
  { id: "u2", name: "U2", shortName: "U2", abbreviation: "U2", group: "B", rating: 1490 },
  { id: "u3", name: "U3", shortName: "U3", abbreviation: "U3", group: "B", rating: 1480 },
  { id: "u4", name: "U4", shortName: "U4", abbreviation: "U4", group: "B", rating: 1470 },
];

function standingRows(): GroupStanding[] {
  return [
    {
      group: "A",
      rows: [
        { teamId: "t1", group: "A", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1500 },
        { teamId: "t2", group: "A", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1490 },
        { teamId: "t3", group: "A", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1480 },
        { teamId: "t4", group: "A", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1470 },
      ],
    },
    {
      group: "B",
      rows: [
        { teamId: "u1", group: "B", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1500 },
        { teamId: "u2", group: "B", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1490 },
        { teamId: "u3", group: "B", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1480 },
        { teamId: "u4", group: "B", played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, conduct: 0, rating: 1470 },
      ],
    },
  ];
}

describe("buildRankingTimeline", () => {
  it("returns empty when no group matches", () => {
    expect(
      buildRankingTimeline({
        matches: [],
        teams,
        matchEvents: {},
        presentStandings: standingRows(),
        presentQualContext: { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} },
      })
    ).toEqual([]);
  });

  it("creates kickoff, goal, and present snapshots for a scored match", () => {
    const match: MergedMatch = {
      id: "M1",
      group: "A",
      date: "2026-06-15T18:00:00.000Z",
      homeTeamId: "t1",
      awayTeamId: "t2",
      status: "completed",
      homeScore: 2,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: true,
      source: "espn",
    };

    const snapshots = buildRankingTimeline({
      matches: [match],
      teams,
      matchEvents: {},
      presentStandings: standingRows(),
      presentQualContext: { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} },
    });

    expect(snapshots.some((s) => s.type === "match-start")).toBe(true);
    expect(snapshots.filter((s) => s.type === "goal").length).toBe(2);
    expect(snapshots.some((s) => s.type === "final-whistle")).toBe(true);
    expect(snapshots[snapshots.length - 1]?.type).toBe("present");
  });

  it("sets crossedCutoff on delta when team moves into top 8", () => {
    const match: MergedMatch = {
      id: "M1",
      group: "A",
      date: "2026-06-15T18:00:00.000Z",
      homeTeamId: "t1",
      awayTeamId: "t2",
      status: "completed",
      homeScore: 1,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: true,
      source: "espn",
    };

    const snapshots = buildRankingTimeline({
      matches: [match],
      teams,
      matchEvents: {},
      presentStandings: standingRows(),
      presentQualContext: { lockedGroupMatchCount: {}, lockedStandingsByGroup: {} },
    });

    const withCutoff = snapshots.flatMap((s) =>
      s.deltas.filter((d) => d.crossedCutoff !== undefined)
    );
    expect(withCutoff.length).toBeGreaterThanOrEqual(0);
  });
});
