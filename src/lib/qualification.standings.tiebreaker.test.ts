import { describe, expect, it } from "vitest";
import { computeStandings } from "@wc2026/qualification";
import type { GroupLetter, MatchWithScore, Team } from "../types";

function team(id: string, group: GroupLetter, fifaRank: number): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase(),
    group,
    rating: 1500,
    fifaRank,
  };
}

function completedMatch(
  id: string,
  group: GroupLetter,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number
): MatchWithScore {
  return {
    id,
    group,
    date: "",
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status: "completed",
    homeConduct: 0,
    awayConduct: 0,
    locked: true,
    source: "espn",
  };
}

describe("group standings tiebreaker order", () => {
  it("ranks equal-points teams by overall goal difference before head-to-head", () => {
    const teams = [team("h", "A", 1), team("i", "A", 2), team("j", "A", 3), team("k", "A", 4)];
    const matches: MatchWithScore[] = [
      completedMatch("1", "A", "h", "i", 1, 1),
      completedMatch("2", "A", "h", "j", 2, 0),
      completedMatch("3", "A", "h", "k", 0, 0),
      completedMatch("4", "A", "i", "j", 1, 0),
      completedMatch("5", "A", "i", "k", 0, 0),
      completedMatch("6", "A", "j", "k", 0, 0),
    ];

    const rows = computeStandings(matches, teams).find((s) => s.group === "A")!.rows;
    const h = rows.find((r) => r.teamId === "h")!;
    const i = rows.find((r) => r.teamId === "i")!;

    expect(h.points).toBe(i.points);
    expect(h.goalDifference).toBeGreaterThan(i.goalDifference);
    expect(rows[0].teamId).toBe("h");
  });
});
