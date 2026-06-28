import { describe, expect, it } from "vitest";
import { mergeTeamsWithCatalog, resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import { canonicalizeMatchTeamIds } from "../services/espnMatchMerge";
import { findEspnMatchForSofaEvent } from "../services/matchLinking";
import { teamDisplayName } from "./teamIdentity";
import { computeStandings } from "./tournament";
import type { MergedMatch, Team } from "../types";

function espnMexico(): Team {
  return {
    id: "205",
    name: "Mexico",
    shortName: "MEX",
    abbreviation: "MEX",
    group: "A",
    rating: 1500,
  };
}

function espnUsa(): Team {
  return {
    id: "627",
    name: "United States",
    shortName: "USA",
    abbreviation: "USA",
    group: "A",
    rating: 1500,
  };
}

function espnParaguay(): Team {
  return {
    id: "660",
    name: "Paraguay",
    shortName: "PAR",
    abbreviation: "PAR",
    group: "D",
    rating: 1500,
  };
}

describe("team identity integration — ESPN 205 / 627", () => {
  const teams = mergeTeamsWithCatalog({
    "205": espnMexico(),
    "627": espnUsa(),
    "660": espnParaguay(),
  });

  it("displays Mexico instead of numeric 205", () => {
    expect(teamDisplayName(undefined, "205", teams)).toBe("Mexico");
    expect(teamDisplayName(undefined, "627", teams)).toBe("United States");
  });

  it("canonicalizes match team ids on write", () => {
    const match: MergedMatch = {
      id: "espn-1",
      date: "2026-06-11T19:00:00Z",
      homeTeamId: "205",
      awayTeamId: "627",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    const canonical = canonicalizeMatchTeamIds(match, teams);
    expect(canonical.homeTeamId).toBe("mex");
    expect(canonical.awayTeamId).toBe("usa");
  });

  it("links SofaScore events via resolved team names", () => {
    const merged: Record<string, MergedMatch> = {
      "espn-1": {
        id: "espn-1",
        date: "2026-06-11T19:00:00.000Z",
        homeTeamId: "205",
        awayTeamId: "627",
        status: "live",
        homeScore: 1,
        awayScore: 0,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    };
    const linked = findEspnMatchForSofaEvent(
      merged,
      {
        id: 999,
        startTimestamp: Date.parse("2026-06-11T19:00:00.000Z") / 1000,
        homeTeam: { name: "Mexico" },
        awayTeam: { name: "United States" },
        status: { type: "inprogress", description: "45'" },
        homeScore: { current: 1 },
        awayScore: { current: 0 },
      },
      teams
    );
    expect(linked?.id).toBe("espn-1");
  });

  it("aggregates standings under canonical ids", () => {
    const standings = computeStandings(
      [
        {
          id: "m1",
          group: "D",
          date: "2026-06-12T19:00:00Z",
          homeTeamId: "627",
          awayTeamId: "660",
          homeScore: 2,
          awayScore: 1,
          homeConduct: 0,
          awayConduct: 0,
          locked: true,
          status: "completed",
          source: "espn",
        },
      ],
      [espnUsa(), espnParaguay()]
    );
    const groupD = standings.find((s) => s.group === "D");
    const ids = groupD?.rows.map((r) => r.teamId) ?? [];
    expect(ids).toContain("usa");
    expect(ids).toContain("par");
    expect(ids).not.toContain("627");
    expect(ids).not.toContain("660");
  });
});
