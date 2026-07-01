import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import { materializeFullSchedule } from "./materializeFullSchedule";
import {
  buildMaterializedMatchIndex,
  resolveDisplayMatch,
} from "./resolveDisplayMatch";
import type { GroupStanding, MergedMatch } from "../types";

function row(teamId: string, group: GroupStanding["group"], points: number) {
  return {
    teamId,
    group,
    played: 3,
    wins: 1,
    draws: 0,
    losses: 0,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
  };
}

describe("resolveDisplayMatch", () => {
  const teams = buildWc2026TeamCatalog();

  it("resolves knockout team ids from materialized schedule", () => {
    const standings: GroupStanding[] = [
      {
        group: "A",
        rows: [row("mex", "A", 9), row("rsa", "A", 6), row("can", "A", 3), row("per", "A", 0)],
      },
      {
        group: "B",
        rows: [row("bra", "B", 9), row("can", "B", 6), row("chi", "B", 3), row("bol", "B", 0)],
      },
    ];

    const raw: MergedMatch = {
      id: "760486",
      espnEventId: "760486",
      matchId: "M73",
      date: "2026-06-28T19:00:00Z",
      homeTeamId: "2nd Group A",
      awayTeamId: "2nd Group B",
      status: "live",
      homeScore: 0,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      clockMinute: 25,
      period: "first_half",
    };

    const schedule = materializeFullSchedule(teams, { M73: raw }, standings);
    const index = buildMaterializedMatchIndex(schedule);
    const display = resolveDisplayMatch(raw, index);

    expect(display.homeTeamId).toBe("rsa");
    expect(display.awayTeamId).toBe("can");
    expect(display.venue).toContain("SoFi Stadium");
  });

  it("inherits kickoff from materialized schedule when live row lacks it", () => {
    const officialKickoff = Date.parse("2026-06-30T17:00:00.000Z");
    const raw: MergedMatch = {
      id: "espn-m77",
      espnEventId: "espn-m77",
      matchId: "M77",
      date: "2026-06-30T20:00:00.000Z",
      status: "live",
      homeTeamId: "civ",
      awayTeamId: "col",
      homeScore: 1,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      clockMinute: 34,
    };
    const materialized: MergedMatch = {
      ...raw,
      id: "M77",
      date: new Date(officialKickoff).toISOString(),
      kickoffMs: officialKickoff,
    };
    const index = buildMaterializedMatchIndex([materialized]);
    const display = resolveDisplayMatch(raw, index);

    expect(display.kickoffMs).toBe(officialKickoff);
    expect(display.date).toBe(materialized.date);
  });

  it("fills venue from broadcast when raw match lacks it", () => {
    const raw: MergedMatch = {
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

    const schedule = materializeFullSchedule(teams, {}, []);
    const index = buildMaterializedMatchIndex(schedule);
    const display = resolveDisplayMatch(raw, index);

    expect(display.venue).toMatch(/,/);
  });
});
