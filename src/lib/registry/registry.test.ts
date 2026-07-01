import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog, mergeTeamsWithCatalog } from "../../data/wc2026TeamCatalog";
import { findChildBracketMatchId, siblingFeederMatchId } from "../bracketTree";
import type { MergedMatch, Team } from "../../types";
import { buildFixtureRegistry } from "./buildFixtureRegistry";
import { dedupeLiveMatchStore } from "./dedupeLiveMatchStore";
import { resolveFixtureRef } from "./resolveFixtureRef";
import { buildTeamRegistry, resolveTeamRef } from "./teamRegistry";
import { normalizeLiveMatchStoreWithRegistry } from "./normalizeWithRegistry";

function makeTeam(id: string, abbrev: string, name: string): Team {
  return {
    id,
    name,
    shortName: abbrev,
    abbreviation: abbrev,
    group: "I",
    rating: 1500,
  };
}

describe("team registry", () => {
  it("maps ESPN numeric id to catalog id via team store", () => {
    const teams = mergeTeamsWithCatalog({
      "468": makeTeam("468", "ESP", "Spain"),
    });
    const registry = buildTeamRegistry(teams);
    expect(resolveTeamRef("468", teams, registry)).toBe("esp");
    expect(resolveTeamRef("ESP", teams, registry)).toBe("esp");
    expect(resolveTeamRef("Spain", teams, registry)).toBe("esp");
  });

  it("collapses duplicate live rows onto official M## key", () => {
    const teams = buildWc2026TeamCatalog();
    const fraSwe: MergedMatch = {
      id: "760492",
      espnEventId: "760492",
      matchId: "M78",
      date: "2026-06-30T21:00:00Z",
      homeTeamId: "fra",
      awayTeamId: "swe",
      status: "live",
      homeScore: 1,
      awayScore: 2,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    const duplicate: MergedMatch = {
      ...fraSwe,
      id: "M78",
    };

    const deduped = dedupeLiveMatchStore({ "760492": fraSwe, M78: duplicate }, teams);
    expect(Object.keys(deduped)).toEqual(["M78"]);
    expect(deduped.M78?.homeTeamId).toBe("fra");
    expect(deduped.M78?.awayTeamId).toBe("swe");
  });
});

describe("fixture registry", () => {
  const teams = {
    ...buildWc2026TeamCatalog(),
    fra: makeTeam("fra", "FRA", "France"),
    swe: makeTeam("swe", "SWE", "Sweden"),
    civ: makeTeam("civ", "CIV", "Ivory Coast"),
    nor: makeTeam("nor", "NOR", "Norway"),
  };

  const registry = buildFixtureRegistry();

  it("resolves M78 France vs Sweden by espn id and kickoff", () => {
    const match: MergedMatch = {
      id: "760492",
      espnEventId: "760492",
      date: "2026-06-30T21:00:00Z",
      homeTeamId: "fra",
      awayTeamId: "swe",
      status: "live",
      homeScore: 1,
      awayScore: 2,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    expect(resolveFixtureRef(match, teams, registry)).toBe("M78");
  });

  it("resolves M77 Ivory Coast vs Norway when espn id and kickoff align", () => {
    const match: MergedMatch = {
      id: "760490",
      espnEventId: "760490",
      date: "2026-06-30T17:00:00Z",
      homeTeamId: "civ",
      awayTeamId: "nor",
      status: "completed",
      homeScore: 1,
      awayScore: 2,
      homeConduct: 0,
      awayConduct: 0,
      locked: true,
      source: "espn",
    };
    expect(resolveFixtureRef(match, teams, registry)).toBe("M77");
  });

  it("resolves M88 by espn id when schedule row is still a placeholder", () => {
    const match: MergedMatch = {
      id: "760501",
      espnEventId: "760501",
      date: "2026-07-04T01:30:00Z",
      homeTeamId: "col",
      awayTeamId: "gha",
      status: "scheduled",
      homeScore: 0,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    expect(resolveFixtureRef(match, teams, registry)).toBe("M88");
  });

  it("resolves NED vs MAR at M76 (760488) not M86", () => {
    const nedMarTeams = {
      ...teams,
      ned: makeTeam("ned", "NED", "Netherlands"),
      mar: makeTeam("mar", "MAR", "Morocco"),
    };
    const match: MergedMatch = {
      id: "760488",
      espnEventId: "760488",
      date: "2026-06-30T01:00:00Z",
      homeTeamId: "ned",
      awayTeamId: "mar",
      status: "live",
      homeScore: 0,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    expect(resolveFixtureRef(match, nedMarTeams, registry)).toBe("M76");
    expect(resolveFixtureRef(match, nedMarTeams, registry)).not.toBe("M86");
  });

  it("routes M78 bracket context to M91 with sibling M77", () => {
    expect(findChildBracketMatchId("M78")).toBe("M91");
    expect(siblingFeederMatchId("M91", "M78")).toBe("M77");
    expect(siblingFeederMatchId("M91", "M88")).toBeUndefined();
  });

  it("normalizes store keys to official match id", () => {
    const raw: Record<string, MergedMatch> = {
      espnLive: {
        id: "760492",
        espnEventId: "760492",
        date: "2026-06-30T21:00:00Z",
        homeTeamId: "468",
        awayTeamId: "472",
        status: "live",
        homeScore: 1,
        awayScore: 2,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn",
      },
    };

    const espnTeams = mergeTeamsWithCatalog({
      "468": makeTeam("468", "FRA", "France"),
      "472": makeTeam("472", "SWE", "Sweden"),
    });

    const normalized = normalizeLiveMatchStoreWithRegistry(raw, espnTeams);
    expect(normalized.M78?.matchId).toBe("M78");
    expect(normalized.M78?.homeTeamId).toBe("fra");
    expect(normalized.M78?.awayTeamId).toBe("swe");
  });
});
