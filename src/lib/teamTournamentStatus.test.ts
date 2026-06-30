import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import { penaltyShootoutFromAggregate } from "./derivePenaltyShootout";
import {
  advancementSectionCopy,
  buildTeamTournamentStatus,
} from "./teamTournamentStatus";
import type { GroupStanding, MergedMatch } from "../types";

const teams = buildWc2026TeamCatalog();

function groupStandings(): GroupStanding[] {
  return [
    {
      group: "E",
      rows: [
        {
          teamId: "ger",
          played: 3,
          wins: 2,
          draws: 0,
          losses: 1,
          goalsFor: 10,
          goalsAgainst: 4,
          goalDifference: 6,
          points: 6,
        },
        {
          teamId: "ecu",
          played: 3,
          wins: 2,
          draws: 0,
          losses: 1,
          goalsFor: 5,
          goalsAgainst: 4,
          goalDifference: 1,
          points: 6,
        },
      ],
    },
  ];
}

describe("buildTeamTournamentStatus", () => {
  it("detects knockout elimination on penalties (Germany vs Ecuador R32)", () => {
    const shootout = penaltyShootoutFromAggregate({ home: 3, away: 4 });
    const matches: MergedMatch[] = [
      {
        id: "M88",
        matchId: "M88",
        stage: "R32",
        date: "2026-06-29T19:00:00Z",
        homeTeamId: "ger",
        awayTeamId: "ecu",
        status: "completed",
        homeScore: 1,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn",
        penaltyShootout: shootout,
        decidedByPenalties: true,
      },
    ];

    const status = buildTeamTournamentStatus({
      teamId: "ger",
      team: teams.ger,
      matches,
      teams,
      matchEvents: {},
      standings: groupStandings(),
    });

    expect(status.phase).toBe("eliminated");
    if (status.phase !== "eliminated") return;
    expect(status.stage).toBe("R32");
    expect(status.viaPenalties).toBe(true);
    expect(status.penHome).toBe(3);
    expect(status.penAway).toBe(4);
    expect(status.opponentId).toBe("ecu");
    expect(advancementSectionCopy(status).label).toContain("Did not advance");
  });

  it("reports advancement after knockout win", () => {
    const matches: MergedMatch[] = [
      {
        id: "M73",
        matchId: "M73",
        stage: "R32",
        date: "2026-06-28T19:00:00Z",
        homeTeamId: "bra",
        awayTeamId: "par",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn",
      },
    ];

    const status = buildTeamTournamentStatus({
      teamId: "bra",
      team: teams.bra,
      matches,
      teams,
      matchEvents: {},
      standings: [],
    });

    expect(status.phase).toBe("in_knockout");
    if (status.phase !== "in_knockout") return;
    expect(status.label).toContain("Round of 16");
  });

  it("falls back to group qualification when no knockout matches", () => {
    const status = buildTeamTournamentStatus({
      teamId: "ger",
      team: teams.ger,
      matches: [],
      teams,
      matchEvents: {},
      standings: groupStandings(),
    });

    expect(status.phase).toBe("group");
    if (status.phase !== "group") return;
    expect(status.groupQualified).toBe(true);
    expect(status.label).toContain("Group E");
  });
});
