import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import { materializeFullSchedule } from "./materializeFullSchedule";
import { prepareLiveMatchStore } from "./liveMatchStorePipeline";
import { resolveKnockoutParticipants } from "./brackets/resolveKnockoutParticipants";
import type { GroupStanding, MergedMatch, TeamRecord } from "../types";

function row(teamId: string, group: GroupStanding["group"], points: number): TeamRecord {
  return {
    teamId,
    group,
    played: 3,
    wins: 1,
    draws: 0,
    losses: 2,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
  };
}

describe("knockout display acceptance", () => {
  const teams = buildWc2026TeamCatalog();

  const standings: GroupStanding[] = [
    { group: "A", rows: [row("mex", "A", 9), row("rsa", "A", 6), row("usa", "A", 3), row("per", "A", 0)] },
    { group: "B", rows: [row("bra", "B", 9), row("can", "B", 6), row("chi", "B", 3), row("bol", "B", 0)] },
    { group: "C", rows: [row("mar", "C", 9), row("bra", "C", 6), row("crc", "C", 3), row("cuw", "C", 0)] },
    { group: "D", rows: [row("usa", "D", 9), row("par", "D", 6), row("hai", "D", 3), row("swe", "D", 0)] },
    { group: "E", rows: [row("ger", "E", 9), row("crc", "E", 6), row("cuw", "E", 3), row("civ", "E", 0)] },
    { group: "F", rows: [row("ned", "F", 9), row("jpn", "F", 6), row("hai", "F", 3), row("swe", "F", 0)] },
    { group: "I", rows: [row("fra", "I", 9), row("nor", "I", 6), row("civ", "I", 3), row("swe", "I", 0)] },
  ];

  it("propagates canonical M75/M76 pen winners to M90 and M91 without same-team slots", () => {
    const polluted: Record<string, MergedMatch> = {
      M86: {
        id: "M86",
        matchId: "M86",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: false,
        homeScore: 2,
        awayScore: 1,
        source: "espn",
        homeConduct: 0,
        awayConduct: 0,
      },
      "760488": {
        id: "760488",
        espnEventId: "760488",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: false,
        homeScore: 2,
        awayScore: 1,
        source: "espn",
        homeConduct: 0,
        awayConduct: 0,
      },
    };

    const store = prepareLiveMatchStore(polluted, teams);
    const participants = resolveKnockoutParticipants(standings, teams, store);

    expect(participants.M90?.home.teamId).toBe("par");
    expect(participants.M90?.away.teamId).toBe("mar");
    expect(participants.M91?.home.teamId).toBe("nor");
    expect(participants.M91?.away.teamId).toBe("fra");
    expect(participants.M90?.home.teamId).not.toBe(participants.M90?.away.teamId);
    expect(participants.M91?.home.teamId).not.toBe(participants.M91?.away.teamId);

    const schedule = materializeFullSchedule(teams, polluted, standings);
    const m90 = schedule.find((m) => m.matchId === "M90");
    const m91 = schedule.find((m) => m.matchId === "M91");
    expect(m90?.homeTeamId).toBe("par");
    expect(m90?.awayTeamId).toBe("mar");
    expect(m91?.homeTeamId).toBe("nor");
    expect(m91?.awayTeamId).toBe("fra");
  });

  it("maps legacy M86 store key winner to schedule M76 for W76", () => {
    const legacyOnly: Record<string, MergedMatch> = {
      M86: {
        id: "M86",
        matchId: "M86",
        espnEventId: "760488",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 1,
        penaltyShootout: { homeScore: 2, awayScore: 3 },
        source: "espn",
        homeConduct: 0,
        awayConduct: 0,
      },
    };

    const store = prepareLiveMatchStore(legacyOnly, teams);
    expect(store.M76?.awayTeamId).toBe("mar");
    expect(store.M76?.penaltyShootout).toEqual({ homeScore: 2, awayScore: 3 });

    const participants = resolveKnockoutParticipants(standings, teams, store);
    expect(participants.M90?.away.teamId).toBe("mar");
  });
});
