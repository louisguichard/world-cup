import { describe, expect, it } from "vitest";
import {
  derivePenaltyShootout,
  isKnockoutPenaltyDecided,
  penaltyShootoutFromAggregate,
  penaltyShootoutFromEvents,
} from "./derivePenaltyShootout";
import type { MatchEvent, MergedMatch } from "../types";

describe("derivePenaltyShootout", () => {
  it("builds shootout from events during penalties period", () => {
    const events: MatchEvent[] = [
      {
        providerId: "1",
        minute: 121,
        type: "goal",
        teamId: "bra",
        playerName: "A",
      },
      {
        providerId: "2",
        minute: 122,
        type: "penalty_missed",
        teamId: "par",
        playerName: "B",
      },
      {
        providerId: "3",
        minute: 123,
        type: "goal",
        teamId: "par",
        playerName: "C",
      },
    ];

    const shootout = penaltyShootoutFromEvents(events, "bra", "par", true);
    expect(shootout?.homeScore).toBe(1);
    expect(shootout?.awayScore).toBe(1);
    expect(shootout?.home).toHaveLength(1);
    expect(shootout?.away).toHaveLength(2);
    expect(shootout?.away[0]?.scored).toBe(false);
  });

  it("derives shootout from post-FT events when period is full_time", () => {
    const events: MatchEvent[] = [
      {
        providerId: "1",
        minute: 121,
        type: "goal",
        teamId: "ger",
        playerName: "A",
      },
      {
        providerId: "2",
        minute: 122,
        type: "goal",
        teamId: "par",
        playerName: "B",
      },
      {
        providerId: "3",
        minute: 123,
        type: "goal",
        teamId: "par",
        playerName: "C",
      },
    ];

    const shootout = derivePenaltyShootout({
      events,
      homeTeamId: "ger",
      awayTeamId: "par",
      period: "full_time",
    });

    expect(shootout?.homeScore).toBe(1);
    expect(shootout?.awayScore).toBe(2);
  });

  it("uses Zafronix aggregate when events are unavailable", () => {
    const shootout = penaltyShootoutFromAggregate({ home: 4, away: 3 });
    expect(shootout.homeScore).toBe(4);
    expect(shootout.awayScore).toBe(3);
  });

  it("prefers existing shootout on match", () => {
    const existing = penaltyShootoutFromAggregate({ home: 5, away: 4 });
    const result = derivePenaltyShootout({
      events: [],
      homeTeamId: "bra",
      awayTeamId: "par",
      period: "full_time",
      existing,
    });
    expect(result).toBe(existing);
  });
});

describe("isKnockoutPenaltyDecided", () => {
  const baseKnockout: MergedMatch = {
    id: "M73",
    matchId: "M73",
    date: "2026-06-28T19:00:00Z",
    homeTeamId: "ger",
    awayTeamId: "par",
    status: "completed",
    homeScore: 1,
    awayScore: 1,
    homeConduct: 0,
    awayConduct: 0,
    locked: true,
    source: "espn",
  };

  it("returns true for completed knockout draw", () => {
    expect(isKnockoutPenaltyDecided(baseKnockout)).toBe(true);
  });

  it("returns false for group-stage draw", () => {
    const groupMatch: MergedMatch = {
      ...baseKnockout,
      id: "M1",
      matchId: "M1",
      group: "A",
    };
    expect(isKnockoutPenaltyDecided(groupMatch)).toBe(false);
  });

  it("returns false for knockout win without penalties", () => {
    expect(isKnockoutPenaltyDecided({ ...baseKnockout, homeScore: 2, awayScore: 1 })).toBe(false);
  });
});
