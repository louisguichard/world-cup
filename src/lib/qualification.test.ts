import { describe, expect, it } from "vitest";
import {
  assertBucketMutualExclusion,
  bucketQualificationTeams,
  buildQualificationContext,
  computeQualificationStatus,
  deriveStandingsIfScored,
  auditFalseConfirmations,
  isConfirmedTopTwo,
  matchesInGroup
} from "./qualification";
import type { GroupLetter, GroupStanding, TeamRecord } from "../types";

function row(teamId: string, group: GroupLetter, played: number, points: number, gd = 0): TeamRecord {
  return {
    teamId,
    group,
    played,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
    conduct: 0,
    rating: 1500
  };
}

function standing(group: GroupLetter, rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

describe("isConfirmedTopTwo", () => {
  it("confirms 1st when all teams played 3 and group is complete", () => {
    const rows = [
      row("usa", "A", 3, 9),
      row("mex", "A", 3, 6),
      row("can", "A", 3, 3),
      row("jpn", "A", 3, 0)
    ];
    expect(isConfirmedTopTwo(row("usa", "A", 3, 9), rows, { lockedGroupMatchCount: 6 })).toBe(true);
  });

  it("does not confirm 1st when an opponent still has a match remaining", () => {
    const rows = [
      row("usa", "A", 3, 9),
      row("mex", "A", 3, 6),
      row("can", "A", 2, 4),
      row("jpn", "A", 3, 0)
    ];
    expect(isConfirmedTopTwo(row("usa", "A", 3, 9), rows)).toBe(false);
    const qual = computeQualificationStatus("usa", [standing("A", rows)]);
    expect(qual.certainty).not.toBe("confirmed");
    expect(qual.certainty).toMatch(/projected/);
  });

  it("does not confirm 2nd in progress even when others cannot mathematically pass", () => {
    const rows = [
      row("mex", "A", 2, 6),
      row("usa", "A", 2, 1),
      row("can", "A", 2, 3),
      row("jpn", "A", 2, 0)
    ];
    expect(isConfirmedTopTwo(row("usa", "A", 2, 1), rows)).toBe(false);
    const qual = computeQualificationStatus("usa", [standing("A", rows)]);
    expect(qual.status).toBe("qualified");
    expect(qual.certainty).toMatch(/projected/);
  });

  it("requires full locked match count when locked rows are provided", () => {
    const rows = [
      row("usa", "A", 3, 9),
      row("mex", "A", 3, 6),
      row("can", "A", 3, 3),
      row("jpn", "A", 3, 0)
    ];
    expect(isConfirmedTopTwo(row("usa", "A", 3, 9), rows, { lockedRows: rows, lockedGroupMatchCount: 5 })).toBe(
      false
    );
    expect(isConfirmedTopTwo(row("usa", "A", 3, 9), rows, { lockedRows: rows, lockedGroupMatchCount: 6 })).toBe(
      true
    );
  });
});

describe("computeQualificationStatus — group complete", () => {
  function twelveGroupsThirds(): GroupStanding[] {
    const groups: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
    return groups.map((group, index) =>
      standing(group, [
        row(`t1-${group}`, group, 3, 9),
        row(`t2-${group}`, group, 3, 6),
        row(`t3-${group}`, group, 3, 8 - index),
        row(`t4-${group}`, group, 3, 0)
      ])
    );
  }

  it("labels best-eight third as at_risk with confirmed certainty", () => {
    const standings = twelveGroupsThirds();
    const can = computeQualificationStatus("t3-A", standings);
    expect(can.status).toBe("at_risk");
    expect(can.certainty).toBe("confirmed");
  });

  it("labels ninth-best third as eliminated with confirmed certainty", () => {
    const standings = twelveGroupsThirds();
    const worst = computeQualificationStatus("t3-L", standings);
    expect(worst.status).toBe("eliminated");
    expect(worst.certainty).toBe("confirmed");
  });

  it("labels 4th place as eliminated confirmed when group is complete", () => {
    const standings = [standing("A", [row("usa", "A", 3, 9), row("mex", "A", 3, 6), row("can", "A", 3, 4), row("jpn", "A", 3, 1)])];
    const jpn = computeQualificationStatus("jpn", standings);
    expect(jpn.status).toBe("eliminated");
    expect(jpn.certainty).toBe("confirmed");
  });
});

describe("locked-only confirmation", () => {
  it("does not confirm when display standings include unlocked simulated scores", () => {
    const teams = [
      { id: "usa", name: "USA", shortName: "USA", abbreviation: "USA", group: "A" as const, rating: 1500 },
      { id: "mex", name: "MEX", shortName: "MEX", abbreviation: "MEX", group: "A" as const, rating: 1500 },
      { id: "can", name: "CAN", shortName: "CAN", abbreviation: "CAN", group: "A" as const, rating: 1500 },
      { id: "jpn", name: "JPN", shortName: "JPN", abbreviation: "JPN", group: "A" as const, rating: 1500 }
    ];
    const baseMatch = {
      group: "A" as const,
      date: "2026-06-11T19:00:00Z",
      status: "completed" as const,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn" as const
    };
    const matches = [
      { ...baseMatch, id: "m1", homeTeamId: "usa", awayTeamId: "mex", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m2", homeTeamId: "usa", awayTeamId: "can", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m3", homeTeamId: "usa", awayTeamId: "jpn", homeScore: 3, awayScore: 0, locked: false },
      { ...baseMatch, id: "m4", homeTeamId: "mex", awayTeamId: "can", homeScore: 1, awayScore: 1, locked: true },
      { ...baseMatch, id: "m5", homeTeamId: "mex", awayTeamId: "jpn", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m6", homeTeamId: "can", awayTeamId: "jpn", homeScore: 1, awayScore: 0, locked: true }
    ];
    const displayStandings = deriveStandingsIfScored(matches, teams)!;
    const context = buildQualificationContext(matches, teams);
    const usa = computeQualificationStatus("usa", displayStandings, context);
    expect(displayStandings[0]!.rows[0]!.played).toBe(3);
    expect(context.lockedStandingsByGroup.A?.find((r) => r.teamId === "usa")?.played).toBe(2);
    expect(usa.certainty).not.toBe("confirmed");
  });

  it("does not confirm when all scores are unlocked even if display shows played 3", () => {
    const teams = [
      { id: "usa", name: "USA", shortName: "USA", abbreviation: "USA", group: "A" as const, rating: 1500 },
      { id: "mex", name: "MEX", shortName: "MEX", abbreviation: "MEX", group: "A" as const, rating: 1500 },
      { id: "can", name: "CAN", shortName: "CAN", abbreviation: "CAN", group: "A" as const, rating: 1500 },
      { id: "jpn", name: "JPN", shortName: "JPN", abbreviation: "JPN", group: "A" as const, rating: 1500 }
    ];
    const baseMatch = {
      group: "A" as const,
      date: "2026-06-11T19:00:00Z",
      status: "completed" as const,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn" as const,
      locked: false
    };
    const matches = [
      { ...baseMatch, id: "m1", homeTeamId: "usa", awayTeamId: "mex", homeScore: 2, awayScore: 0 },
      { ...baseMatch, id: "m2", homeTeamId: "usa", awayTeamId: "can", homeScore: 2, awayScore: 0 },
      { ...baseMatch, id: "m3", homeTeamId: "usa", awayTeamId: "jpn", homeScore: 3, awayScore: 0 },
      { ...baseMatch, id: "m4", homeTeamId: "mex", awayTeamId: "can", homeScore: 1, awayScore: 1 },
      { ...baseMatch, id: "m5", homeTeamId: "mex", awayTeamId: "jpn", homeScore: 2, awayScore: 0 },
      { ...baseMatch, id: "m6", homeTeamId: "can", awayTeamId: "jpn", homeScore: 1, awayScore: 0 }
    ];
    const displayStandings = deriveStandingsIfScored(matches, teams)!;
    const context = buildQualificationContext(matches, teams);
    expect(context.lockedStandingsByGroup.A?.find((r) => r.teamId === "usa")?.played).toBe(0);
    const usa = computeQualificationStatus("usa", displayStandings, context);
    expect(usa.certainty).not.toBe("confirmed");
  });
});

describe("auditFalseConfirmations", () => {
  it("detects no false positives for locked-only incomplete group", () => {
    const teams = [
      { id: "usa", name: "USA", shortName: "USA", abbreviation: "USA", group: "A" as const, rating: 1500 },
      { id: "mex", name: "MEX", shortName: "MEX", abbreviation: "MEX", group: "A" as const, rating: 1500 },
      { id: "can", name: "CAN", shortName: "CAN", abbreviation: "CAN", group: "A" as const, rating: 1500 },
      { id: "jpn", name: "JPN", shortName: "JPN", abbreviation: "JPN", group: "A" as const, rating: 1500 }
    ];
    const baseMatch = {
      group: "A" as const,
      date: "2026-06-11T19:00:00Z",
      status: "completed" as const,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn" as const
    };
    const matches = [
      { ...baseMatch, id: "m1", homeTeamId: "usa", awayTeamId: "mex", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m2", homeTeamId: "usa", awayTeamId: "can", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m3", homeTeamId: "usa", awayTeamId: "jpn", homeScore: 3, awayScore: 0, locked: false },
      { ...baseMatch, id: "m4", homeTeamId: "mex", awayTeamId: "can", homeScore: 1, awayScore: 1, locked: true },
      { ...baseMatch, id: "m5", homeTeamId: "mex", awayTeamId: "jpn", homeScore: 2, awayScore: 0, locked: true },
      { ...baseMatch, id: "m6", homeTeamId: "can", awayTeamId: "jpn", homeScore: 1, awayScore: 0, locked: true }
    ];
    const displayStandings = deriveStandingsIfScored(matches, teams)!;
    const context = buildQualificationContext(matches, teams);
    expect(auditFalseConfirmations(displayStandings, context)).toEqual([]);
  });
});

describe("bucketQualificationTeams", () => {
  it("buckets stay mutually exclusive", () => {
    const standings = [
      standing("A", [row("usa", "A", 2, 4), row("mex", "A", 2, 4), row("can", "A", 2, 3), row("jpn", "A", 2, 0)])
    ];
    assertBucketMutualExclusion(bucketQualificationTeams(["usa", "mex", "can", "jpn"], standings));
  });

  it("matchesInGroup supports withdrawals", () => {
    expect(matchesInGroup(4)).toBe(6);
    expect(matchesInGroup(3)).toBe(3);
  });
});
