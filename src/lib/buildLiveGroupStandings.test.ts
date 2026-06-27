import { describe, expect, it } from "vitest";
import type { MergedMatch, Team } from "../types";
import {
  buildLiveGroupReplayMatches,
  computeLiveGroupStanding,
  liveGroupsFromMatches,
  liveTeamIdsInGroup,
} from "./buildLiveGroupStandings";

const teams: Team[] = [
  { id: "g1", name: "G1", shortName: "G1", abbreviation: "G1", group: "G", rating: 1500 },
  { id: "g2", name: "G2", shortName: "G2", abbreviation: "G2", group: "G", rating: 1490 },
  { id: "g3", name: "G3", shortName: "G3", abbreviation: "G3", group: "G", rating: 1480 },
  { id: "g4", name: "G4", shortName: "G4", abbreviation: "G4", group: "G", rating: 1470 },
];

function liveMatch(partial: Partial<MergedMatch> & Pick<MergedMatch, "id">): MergedMatch {
  return {
    id: partial.id,
    group: "G",
    date: "2026-06-27T21:00:00Z",
    homeTeamId: "g1",
    awayTeamId: "g2",
    homeScore: 0,
    awayScore: 0,
    status: "live",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    ...partial,
  };
}

describe("buildLiveGroupStandings", () => {
  it("ignores in-progress 0-0 live matches", () => {
    const replays = buildLiveGroupReplayMatches(
      [liveMatch({ id: "m1", homeScore: 0, awayScore: 0 })],
      "G"
    );
    expect(replays).toHaveLength(0);
  });

  it("includes live partial scores in standings", () => {
    const standing = computeLiveGroupStanding(
      "G",
      [liveMatch({ id: "m1", homeScore: 2, awayScore: 1 })],
      teams
    );
    const g1 = standing?.rows.find((row) => row.teamId === "g1");
    const g2 = standing?.rows.find((row) => row.teamId === "g2");
    expect(g1?.points).toBe(3);
    expect(g1?.goalDifference).toBe(1);
    expect(g2?.points).toBe(0);
    expect(g2?.goalDifference).toBe(-1);
  });

  it("combines finished and live matches in the same group", () => {
    const standing = computeLiveGroupStanding(
      "G",
      [
        liveMatch({
          id: "done",
          homeTeamId: "g3",
          awayTeamId: "g4",
          homeScore: 1,
          awayScore: 1,
          status: "completed",
          locked: true,
        }),
        liveMatch({ id: "live", homeScore: 3, awayScore: 0 }),
      ],
      teams
    );
    const g1 = standing?.rows.find((row) => row.teamId === "g1");
    const g3 = standing?.rows.find((row) => row.teamId === "g3");
    expect(g1?.points).toBe(3);
    expect(g3?.points).toBe(1);
  });

  it("tracks live groups and playing teams", () => {
    const matches = [
      liveMatch({ id: "a", group: "G" }),
      liveMatch({ id: "b", group: "L", homeTeamId: "x", awayTeamId: "y" }),
    ];
    expect(liveGroupsFromMatches(matches)).toEqual(["G", "L"]);
    expect(liveTeamIdsInGroup(matches, "G")).toEqual(new Set(["g1", "g2"]));
  });
});
