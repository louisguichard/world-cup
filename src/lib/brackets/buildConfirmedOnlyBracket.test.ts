import { describe, expect, it } from "vitest";
import { buildConfirmedOnlyBracket } from "./buildConfirmedOnlyBracket";
import type { GroupStanding, Match, MergedMatch, Team, TeamRecord } from "../../types";

function team(id: string, group: Team["group"] = "E"): Team {
  return {
    id,
    name: id,
    shortName: id,
    abbreviation: id.toUpperCase().slice(0, 3),
    group,
    logo: "",
    rating: 1500,
  };
}

function row(teamId: string, group: Team["group"], points: number): TeamRecord {
  return {
    teamId,
    played: 3,
    wins: 1,
    draws: 0,
    losses: 2,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
    group,
  };
}

function standing(group: GroupStanding["group"], rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

function liveMatch(overrides: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    matchId: overrides.id,
    homeTeamId: "ger",
    awayTeamId: "par",
    date: "2026-06-29",
    status: "completed",
    locked: true,
    source: "espn",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 3, awayScore: 4 },
    ...overrides,
  };
}

const slotStandings: GroupStanding[] = [
  standing("E", [row("ger", "E", 9), row("crc", "E", 6), row("cuw", "E", 3), row("civ", "E", 0)]),
  standing("F", [row("fra", "F", 9), row("par", "F", 6), row("hai", "F", 3), row("swe", "F", 0)]),
];

describe("buildConfirmedOnlyBracket", () => {
  it("does not advance eliminated teams into later rounds", () => {
    const teams = [team("ger", "E"), team("par", "F"), team("fra", "F")];
    const liveMatches: Record<string, MergedMatch> = {
      M76: liveMatch({ id: "M76", matchId: "M76", homeTeamId: "ger", awayTeamId: "par" }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        E: slotStandings[0]!.rows,
        F: slotStandings[1]!.rows,
      },
    });

    const laterWithGermany = bracket.filter(
      (slot) =>
        slot.stage !== "R32" &&
        (slot.homeTeamId === "ger" || slot.awayTeamId === "ger")
    );

    expect(laterWithGermany).toHaveLength(0);

    const m76 = bracket.find((slot) => slot.id === "M76");
    expect(m76?.homeTeamId).toBe("ger");
    expect(m76?.awayTeamId).toBe("par");
    expect(m76?.winnerTeamId).toBe("par");
  });

  it("only confirms later-round slots from locked feeder winners", () => {
    const teams = [
      team("can", "A"),
      team("usa", "D"),
      team("par", "F"),
      team("ger", "E"),
      team("rsa", "A"),
    ];
    const liveMatches: Record<string, MergedMatch> = {
      M73: liveMatch({
        id: "M73",
        matchId: "M73",
        homeTeamId: "can",
        awayTeamId: "rsa",
        homeScore: 1,
        awayScore: 0,
        penaltyShootout: undefined,
      }),
      M75: liveMatch({
        id: "M75",
        matchId: "M75",
        homeTeamId: "usa",
        awayTeamId: "par",
        homeScore: 2,
        awayScore: 1,
        penaltyShootout: undefined,
      }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        A: [row("can", "A", 9), row("rsa", "A", 6), row("mex", "A", 3), row("per", "A", 0)],
        D: [row("usa", "D", 9), row("par", "D", 6), row("crc", "D", 3), row("cuw", "D", 0)],
        E: slotStandings[0]!.rows,
        F: slotStandings[1]!.rows,
      },
    });

    const m90 = bracket.find((slot) => slot.id === "M90");
    expect(m90?.homeTeamId).toBe("usa");
    expect(m90?.awayTeamId).toBe("can");
    expect(m90?.homeCertainty).toBe("confirmed");
    expect(m90?.awayCertainty).toBe("confirmed");
  });

  it("prefers live ESPN team ids over standings-derived R32 slots", () => {
    const teams = [team("ger", "E"), team("par", "F"), team("hai", "F")];
    const liveMatches: Record<string, MergedMatch> = {
      M76: liveMatch({ id: "M76", matchId: "M76", homeTeamId: "ger", awayTeamId: "par" }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        E: slotStandings[0]!.rows,
        F: slotStandings[1]!.rows,
      },
    });

    const m76 = bracket.find((slot) => slot.id === "M76");
    expect(m76?.awayTeamId).toBe("par");
    expect(m76?.awayTeamId).not.toBe("hai");
  });
});
