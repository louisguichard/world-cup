import { beforeEach, describe, expect, it } from "vitest";
import { resetOfficialGroupRosterCache } from "../../lib/officialGroupRoster";
import { buildQualificationSnapshot } from "../../lib/qualificationView";
import type { Team } from "../../types";
import { buildStandingsFromTeamGroups, finalizeGroupStandings, mergeStandingsPartials, normalizeStandingsTeamIds } from "./normalizeStandings";

function team(id: string, group: Team["group"], fifaRank: number): Team {
  return {
    id,
    name: id.toUpperCase(),
    shortName: id.toUpperCase(),
    abbreviation: id.toUpperCase(),
    group,
    rating: 1500,
    fifaRank,
  };
}

describe("buildStandingsFromTeamGroups", () => {
  beforeEach(() => {
    resetOfficialGroupRosterCache();
  });

  it("seeds zero-point tables so qualification panels can populate", () => {
    const teams = [
      team("mex", "A", 14),
      team("usa", "A", 11),
      team("can", "A", 40),
      team("jpn", "A", 18),
    ];
    const standings = buildStandingsFromTeamGroups(teams);
    expect(standings).toHaveLength(1);
    expect(standings[0]!.rows.map((r) => r.teamId)).toEqual(["usa", "mex", "jpn", "can"]);

    const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
    const snapshot = buildQualificationSnapshot(teamsById, standings, []);
    expect(snapshot.layout.movingOn.projected.length).toBeGreaterThan(0);
    expect(snapshot.layout.inContention.alive.length).toBeGreaterThan(0);
  });
});

describe("normalizeStandingsTeamIds", () => {
  it("maps ESPN numeric ids to catalog ids", () => {
    const teams: Record<string, Team> = {
      "203": {
        id: "203",
        name: "Mexico",
        shortName: "MEX",
        abbreviation: "MEX",
        group: "A",
        rating: 1500,
        fifaRank: 14,
      },
    };
    const normalized = normalizeStandingsTeamIds(
      [
        {
          group: "A",
          rows: [
            {
              teamId: "203",
              group: "A",
              played: 1,
              wins: 1,
              draws: 0,
              losses: 0,
              goalsFor: 2,
              goalsAgainst: 0,
              goalDifference: 2,
              points: 3,
              conduct: 0,
              rating: 1500,
            },
          ],
        },
      ],
      teams
    );
    expect(normalized[0]!.rows[0]!.teamId).toBe("mex");
  });

  it("dedupes catalog and upstream ids for the same nation", () => {
    const teams: Record<string, Team> = {
      mex: team("mex", "A", 14),
      "203": {
        id: "203",
        name: "Mexico",
        shortName: "MEX",
        abbreviation: "MEX",
        group: "A",
        rating: 1500,
        fifaRank: 14,
      },
    };
    const finalized = finalizeGroupStandings(
      [
        {
          group: "A",
          rows: [
            {
              teamId: "mex",
              group: "A",
              played: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              goalDifference: 0,
              points: 0,
              conduct: 0,
              rating: 1500,
            },
            {
              teamId: "203",
              group: "A",
              played: 2,
              wins: 2,
              draws: 0,
              losses: 0,
              goalsFor: 5,
              goalsAgainst: 1,
              goalDifference: 4,
              points: 6,
              conduct: 0,
              rating: 1500,
            },
          ],
        },
      ],
      teams
    );
    expect(finalized[0]!.rows.filter((row) => row.teamId === "mex")).toHaveLength(1);
    const mex = finalized[0]!.rows.find((row) => row.teamId === "mex");
    expect(mex?.points).toBe(6);
    expect(finalized[0]!.rows).toHaveLength(4);
  });
});

describe("mergeStandingsPartials", () => {
  it("keeps cached stats when a later source only seeds zero-point rows", () => {
    const cached = [
      {
        group: "A" as const,
        rows: [
          {
            teamId: "mex",
            group: "A" as const,
            played: 2,
            wins: 2,
            draws: 0,
            losses: 0,
            goalsFor: 5,
            goalsAgainst: 1,
            goalDifference: 4,
            points: 6,
            conduct: 0,
            rating: 1500,
          },
        ],
      },
    ];
    const seeded = buildStandingsFromTeamGroups([
      team("mex", "A", 14),
      team("usa", "A", 11),
      team("can", "A", 40),
      team("jpn", "A", 18),
    ]);

    const merged = mergeStandingsPartials(cached, seeded);
    const mex = merged[0]!.rows.find((row) => row.teamId === "mex");
    expect(mex?.points).toBe(6);
    expect(mex?.played).toBe(2);
  });
});
