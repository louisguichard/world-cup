import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import {
  flagTeamIdForMatch,
  teamDisplayNameForMatch,
  teamDisplayNameFromId,
} from "./matchTeamDisplay";
import { materializeFullSchedule } from "./materializeFullSchedule";
import type { GroupStanding, MergedMatch } from "../types";

const catalog = buildWc2026TeamCatalog();

describe("matchTeamDisplay", () => {
  it("resolves catalog name from lowercase id when store team is missing", () => {
    expect(teamDisplayNameFromId("bra", {})).toBe("Brazil");
  });

  it("never shows ESPN numeric ids", () => {
    expect(teamDisplayNameFromId("760415", {})).toBe("TBD");
  });

  it("uses schedule placeholder when team id is empty", () => {
    const match: MergedMatch = {
      id: "M73",
      matchId: "M73",
      date: "2026-07-05T19:00:00Z",
      homeTeamId: "",
      awayTeamId: "",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    const label = teamDisplayNameForMatch(match, "home", catalog);
    expect(label).not.toBe("");
    expect(label).not.toMatch(/^[a-z]{3}$/);
    expect(label.length).toBeGreaterThan(2);
  });

  it("prefers catalog flag id over raw backend id", () => {
    const match: MergedMatch = {
      id: "M1",
      matchId: "M1",
      date: "2026-06-11T19:00:00Z",
      homeTeamId: "mex",
      awayTeamId: "rsa",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    expect(flagTeamIdForMatch(match, "home", catalog)).toBe("mex");
    expect(teamDisplayNameForMatch(match, "home", catalog)).toBe("Mexico");
  });

  it("shows resolved team name when standings populate knockout slot", () => {
    const standings: GroupStanding[] = [
      {
        group: "A",
        rows: [
          {
            teamId: "usa",
            group: "A",
            played: 3,
            wins: 3,
            draws: 0,
            losses: 0,
            goalsFor: 9,
            goalsAgainst: 0,
            goalDifference: 9,
            points: 9,
            conduct: 0,
          },
          {
            teamId: "mex",
            group: "A",
            played: 3,
            wins: 2,
            draws: 0,
            losses: 1,
            goalsFor: 6,
            goalsAgainst: 3,
            goalDifference: 3,
            points: 6,
            conduct: 0,
          },
          {
            teamId: "can",
            group: "A",
            played: 3,
            wins: 1,
            draws: 0,
            losses: 2,
            goalsFor: 3,
            goalsAgainst: 6,
            goalDifference: -3,
            points: 3,
            conduct: 0,
          },
          {
            teamId: "per",
            group: "A",
            played: 3,
            wins: 0,
            draws: 0,
            losses: 3,
            goalsFor: 0,
            goalsAgainst: 9,
            goalDifference: -9,
            points: 0,
            conduct: 0,
          },
        ],
      },
      {
        group: "B",
        rows: [
          {
            teamId: "bra",
            group: "B",
            played: 3,
            wins: 3,
            draws: 0,
            losses: 0,
            goalsFor: 9,
            goalsAgainst: 0,
            goalDifference: 9,
            points: 9,
            conduct: 0,
          },
          {
            teamId: "ecu",
            group: "B",
            played: 3,
            wins: 2,
            draws: 0,
            losses: 1,
            goalsFor: 6,
            goalsAgainst: 3,
            goalDifference: 3,
            points: 6,
            conduct: 0,
          },
          {
            teamId: "chi",
            group: "B",
            played: 3,
            wins: 1,
            draws: 0,
            losses: 2,
            goalsFor: 3,
            goalsAgainst: 6,
            goalDifference: -3,
            points: 3,
            conduct: 0,
          },
          {
            teamId: "bol",
            group: "B",
            played: 3,
            wins: 0,
            draws: 0,
            losses: 3,
            goalsFor: 0,
            goalsAgainst: 9,
            goalDifference: -9,
            points: 0,
            conduct: 0,
          },
        ],
      },
    ];

    const schedule = materializeFullSchedule(catalog, {}, standings);
    const m81 = schedule.find((m) => m.matchId === "M81");
    expect(m81?.homeTeamId).toBe("mex");
    expect(teamDisplayNameForMatch(m81!, "home", catalog)).toBe("Mexico");
    expect(teamDisplayNameForMatch(m81!, "away", catalog)).toBe("Ecuador");
  });
});
