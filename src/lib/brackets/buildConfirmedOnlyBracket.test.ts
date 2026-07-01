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
    const teams = [team("ger", "E"), team("par", "F"), team("fra", "F"), team("ned", "F"), team("mar", "C")];
    const liveMatches: Record<string, MergedMatch> = {};

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

    const m75 = bracket.find((slot) => slot.id === "M75");
    expect(m75?.homeTeamId).toBe("ger");
    expect(m75?.awayTeamId).toBe("par");
    expect(m75?.winnerTeamId).toBe("par");
  });

  it("only confirms later-round slots from locked feeder winners", () => {
    const teams = [
      team("can", "A"),
      team("usa", "D"),
      team("par", "F"),
      team("ger", "E"),
      team("rsa", "A"),
      team("ned", "F"),
      team("mar", "C"),
    ];
    const liveMatches: Record<string, MergedMatch> = {};

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        E: slotStandings[0]!.rows,
        F: slotStandings[1]!.rows,
        C: [row("mar", "C", 9), row("bra", "C", 6), row("crc", "C", 3), row("cuw", "C", 0)],
      },
    });

    const m90 = bracket.find((slot) => slot.id === "M90");
    expect(m90?.homeTeamId).toBe("par");
    expect(m90?.awayTeamId).toBe("mar");
    expect(m90?.homeCertainty).toBe("confirmed");
    expect(m90?.awayCertainty).toBe("confirmed");
  });

  it("prefers live ESPN team ids over standings-derived R32 slots", () => {
    const teams = [team("ger", "E"), team("par", "F"), team("hai", "F"), team("mex", "A"), team("ecu", "E")];
    const liveMatches: Record<string, MergedMatch> = {
      M79: liveMatch({
        id: "M79",
        matchId: "M79",
        homeTeamId: "mex",
        awayTeamId: "ecu",
        homeScore: 0,
        awayScore: 0,
        status: "scheduled",
        locked: false,
        penaltyShootout: undefined,
      }),
    };

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        A: [row("mex", "A", 9), row("rsa", "A", 6), row("usa", "A", 3), row("per", "A", 0)],
        E: [row("ecu", "E", 9), row("ger", "E", 6), row("crc", "E", 3), row("civ", "E", 0)],
      },
    });

    const m79 = bracket.find((slot) => slot.id === "M79");
    expect(m79?.homeTeamId).toBe("mex");
    expect(m79?.awayTeamId).toBe("ecu");
    expect(m79?.awayTeamId).not.toBe("hai");
  });

  it("does not advance eliminated NED from locked M76 into R16 when standings drift", () => {
    const teams = [
      team("ned", "F"),
      team("mar", "C"),
      team("por", "K"),
      team("ita", "I"),
      team("ger", "E"),
      team("par", "F"),
    ];
    const liveMatches: Record<string, MergedMatch> = {};

    const { bracket } = buildConfirmedOnlyBracket(teams, [] as Match[], liveMatches, {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {
        F: [row("ned", "F", 9), row("par", "F", 6), row("hai", "F", 3), row("swe", "F", 0)],
        C: [row("mar", "C", 9), row("bra", "C", 6), row("crc", "C", 3), row("cuw", "C", 0)],
        E: slotStandings[0]!.rows,
      },
    });

    const m76 = bracket.find((slot) => slot.id === "M76");
    expect(m76?.winnerTeamId).toBe("mar");

    const m90 = bracket.find((slot) => slot.id === "M90");
    expect(m90?.awayTeamId).toBe("mar");
    expect(m90?.awayTeamId).not.toBe("ned");
  });
});
