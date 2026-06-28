import { describe, expect, it } from "vitest";
import { deriveStandingsIfScored } from "./qualification";
import type { Match, Team } from "../types";

const teams: Team[] = [
  {
    id: "a",
    name: "Team A",
    shortName: "A",
    abbreviation: "A",
    group: "A",
    rating: 1500
  },
  {
    id: "b",
    name: "Team B",
    shortName: "B",
    abbreviation: "B",
    group: "A",
    rating: 1500
  }
];

describe("deriveStandingsIfScored", () => {
  it("returns null when no scored group matches exist", () => {
    const unscored: Match[] = [
      {
        id: "1",
        group: "A",
        date: "2026-06-11T19:00:00Z",
        homeTeamId: "a",
        awayTeamId: "b",
        status: "scheduled",
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn"
      }
    ];

    expect(deriveStandingsIfScored(unscored, teams)).toBeNull();
  });

  it("derives standings when scored group matches exist", () => {
    const scored: Match[] = [
      {
        id: "1",
        group: "A",
        date: "2026-06-11T19:00:00Z",
        homeTeamId: "a",
        awayTeamId: "b",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn"
      }
    ];

    const standings = deriveStandingsIfScored(scored, teams);
    expect(standings).not.toBeNull();
    const groupA = standings?.find((standing) => standing.group === "A");
    expect(groupA?.rows.filter((row) => row.teamId === "a" || row.teamId === "b")).toHaveLength(2);
  });

  it("ignores in-progress 0-0 live matches", () => {
    const matches: Match[] = [
      {
        id: "live-00",
        group: "A",
        date: "2026-06-11T19:00:00Z",
        homeTeamId: "a",
        awayTeamId: "b",
        status: "live",
        homeScore: 0,
        awayScore: 0,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    ];

    expect(deriveStandingsIfScored(matches, teams)).toBeNull();
  });

  it("counts completed 0-0 draws", () => {
    const matches: Match[] = [
      {
        id: "done-00",
        group: "A",
        date: "2026-06-11T19:00:00Z",
        homeTeamId: "a",
        awayTeamId: "b",
        status: "completed",
        homeScore: 0,
        awayScore: 0,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn",
      },
    ];

    const standings = deriveStandingsIfScored(matches, teams);
    const groupA = standings?.find((standing) => standing.group === "A");
    expect(groupA?.rows.filter((row) => row.teamId === "a" || row.teamId === "b").every((r) => r.played === 1 && r.points === 1)).toBe(true);
  });
});
