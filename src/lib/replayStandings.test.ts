import { describe, expect, it } from "vitest";
import { replayStandings } from "./replayStandings";
import type { Team } from "../types";

const teams: Team[] = [
  { id: "a1", name: "A1", shortName: "A1", abbreviation: "A1", group: "A", rating: 1500 },
  { id: "a2", name: "A2", shortName: "A2", abbreviation: "A2", group: "A", rating: 1490 },
  { id: "a3", name: "A3", shortName: "A3", abbreviation: "A3", group: "A", rating: 1480 },
  { id: "a4", name: "A4", shortName: "A4", abbreviation: "A4", group: "A", rating: 1470 },
];

describe("replayStandings", () => {
  it("returns zeroed tables when no partial matches contribute", () => {
    const standings = replayStandings([], teams);
    const groupA = standings.find((s) => s.group === "A");
    expect(groupA?.rows.every((r) => r.points === 0 && r.played === 0)).toBe(true);
  });

  it("ignores in-progress 0-0 matches", () => {
    const standings = replayStandings(
      [
        {
          matchId: "M1",
          homeTeamId: "a1",
          awayTeamId: "a2",
          group: "A",
          homeScore: 0,
          awayScore: 0,
          isCompleted: false,
        },
      ],
      teams
    );
    const groupA = standings.find((s) => s.group === "A");
    expect(groupA?.rows.every((r) => r.played === 0)).toBe(true);
  });

  it("counts completed 0-0 as a draw", () => {
    const standings = replayStandings(
      [
        {
          matchId: "M1",
          homeTeamId: "a1",
          awayTeamId: "a2",
          group: "A",
          homeScore: 0,
          awayScore: 0,
          isCompleted: true,
        },
      ],
      teams
    );
    const a1 = standings.find((s) => s.group === "A")?.rows.find((r) => r.teamId === "a1");
    const a2 = standings.find((s) => s.group === "A")?.rows.find((r) => r.teamId === "a2");
    expect(a1?.points).toBe(1);
    expect(a2?.points).toBe(1);
  });

  it("awards win points for partial in-progress scores", () => {
    const standings = replayStandings(
      [
        {
          matchId: "M1",
          homeTeamId: "a1",
          awayTeamId: "a2",
          group: "A",
          homeScore: 2,
          awayScore: 0,
          isCompleted: false,
        },
      ],
      teams
    );
    const a1 = standings.find((s) => s.group === "A")?.rows.find((r) => r.teamId === "a1");
    expect(a1?.points).toBe(3);
    expect(a1?.goalsFor).toBe(2);
  });
});
