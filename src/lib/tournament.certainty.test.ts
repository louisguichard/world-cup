import { describe, expect, it } from "vitest";
import { annotateBracketCertainty } from "./tournament";
import type { BracketMatch, GroupLetter, GroupStanding, TeamRecord } from "../types";

function row(teamId: string, group: GroupLetter, played: number, points: number): TeamRecord {
  return {
    teamId,
    group,
    played,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points,
    conduct: 0,
    rating: 1500
  };
}

function standing(group: GroupLetter, rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

describe("annotateBracketCertainty", () => {
  it("clears ghosts on confirmed R32 slots", () => {
    const standings = [
      standing("A", [
        row("usa", "A", 3, 9),
        row("mex", "A", 3, 6),
        row("can", "A", 3, 3),
        row("jpn", "A", 3, 0)
      ])
    ];
    const bracket: BracketMatch[] = [
      {
        id: "M79",
        stage: "R32",
        label: "M79",
        homeTeamId: "usa",
        awayTeamId: "can",
        homeSeedLabel: "1A",
        awaySeedLabel: "3A",
        source: "simulated"
      }
    ];

    const annotated = annotateBracketCertainty(bracket, standings);
    expect(annotated[0]?.homeCertainty).toBe("confirmed");
    expect(annotated[0]?.homeGhosts).toBeUndefined();
  });

  it("propagates confirmed winner certainty into R16", () => {
    const standings = [
      standing("E", [
        row("usa", "E", 3, 9),
        row("mex", "E", 3, 6),
        row("can", "E", 3, 3),
        row("jpn", "E", 3, 0)
      ])
    ];
    const r32: BracketMatch = {
      id: "M74",
      stage: "R32",
      label: "M74",
      homeTeamId: "usa",
      awayTeamId: "mex",
      homeSeedLabel: "1E",
      awaySeedLabel: "3:1E",
      source: "simulated",
      winnerTeamId: "usa"
    };
    const r16: BracketMatch = {
      id: "M89",
      stage: "R16",
      label: "M89",
      homeTeamId: "usa",
      awayTeamId: "fra",
      homeSeedLabel: "W74",
      awaySeedLabel: "W77",
      source: "simulated"
    };

    const annotated = annotateBracketCertainty([r32, r16], standings);
    const m89 = annotated.find((m) => m.id === "M89");
    expect(m89?.homeCertainty).toBe("confirmed");
    expect(m89?.homeGhosts).toBeUndefined();
  });
});
