import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import { materializeFullSchedule } from "./materializeFullSchedule";
import type { GroupStanding, TeamRecord } from "../types";

function row(teamId: string, group: GroupStanding["group"], points: number): TeamRecord {
  return {
    teamId,
    group,
    played: 3,
    wins: points >= 3 ? 1 : 0,
    draws: 0,
    losses: 0,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
  };
}

describe("materializeFullSchedule knockout resolution", () => {
  const teams = buildWc2026TeamCatalog();

  it("resolves R32 placeholders to actual teams from standings", () => {
    const standings: GroupStanding[] = [
      {
        group: "A",
        rows: [row("usa", "A", 9), row("mex", "A", 6), row("can", "A", 3), row("per", "A", 0)],
      },
      {
        group: "B",
        rows: [row("bra", "B", 9), row("ecu", "B", 6), row("chi", "B", 3), row("bol", "B", 0)],
      },
    ];

    const schedule = materializeFullSchedule(teams, {}, standings);
    const m81 = schedule.find((m) => m.matchId === "M81");
    expect(m81?.homeTeamId).toBe("mex");
    expect(m81?.awayTeamId).toBe("ecu");
  });

  it("leaves knockout slots empty when standings are unavailable", () => {
    const schedule = materializeFullSchedule(teams, {}, []);
    const m73 = schedule.find((m) => m.matchId === "M73");
    expect(m73?.homeTeamId).toBe("");
    expect(m73?.awayTeamId).toBe("");
  });

  it("resolves knockout ids through live overlay shells with empty team ids", () => {
    const standings: GroupStanding[] = [
      {
        group: "A",
        rows: [row("mex", "A", 9), row("rsa", "A", 6), row("can", "A", 3), row("per", "A", 0)],
      },
      {
        group: "B",
        rows: [row("bra", "B", 9), row("ecu", "B", 6), row("chi", "B", 3), row("bol", "B", 0)],
      },
    ];
    const liveMatches = {
      M81: {
        id: "760484",
        matchId: "M81",
        date: "2026-06-28T19:00:00Z",
        homeTeamId: "2nd Group A",
        awayTeamId: "2nd Group B",
        status: "scheduled" as const,
        homeConduct: 0,
        awayConduct: 0,
        locked: false,
        source: "espn" as const,
        espnEventId: "760484",
      },
    };

    const schedule = materializeFullSchedule(teams, liveMatches, standings);
    const m81 = schedule.find((m) => m.matchId === "M81");
    expect(m81?.homeTeamId).toBe("rsa");
    expect(m81?.awayTeamId).toBe("ecu");
    expect(m81?.espnEventId).toBe("760484");
  });
});
