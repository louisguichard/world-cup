import { describe, expect, it } from "vitest";
import type { MatchEvent, MergedMatch, Team } from "../types";
import {
  buildTournamentPulseViewModel,
  KNOCKOUT_FIELD_TEAMS,
  TOTAL_TOURNAMENT_MATCHES,
} from "./buildTournamentPulseViewModel";

const teams: Record<string, Team> = {
  arg: { id: "arg", name: "Argentina", abbreviation: "ARG", group: "J", rating: 1500 },
  fra: { id: "fra", name: "France", abbreviation: "FRA", group: "D", rating: 1500 },
};

const completedKnockout = (
  id: string,
  home: string,
  away: string,
  homeScore: number,
  awayScore: number
): MergedMatch => ({
  id,
  matchId: id,
  stage: "R32",
  homeTeamId: home,
  awayTeamId: away,
  homeScore,
  awayScore,
  status: "completed",
  locked: true,
  source: "espn",
  date: "2026-07-05",
  homeConduct: 0,
  awayConduct: 0,
});

describe("buildTournamentPulseViewModel", () => {
  it("counts played matches, goals, and discipline from schedule + events", () => {
    const schedule: MergedMatch[] = [
      completedKnockout("M74", "arg", "fra", 2, 1),
      {
        ...completedKnockout("M1", "usa", "mex", 0, 0),
        stage: "Group Stage",
        matchId: "M1",
        id: "M1",
        locked: true,
      },
    ];

    const matchEvents: Record<string, MatchEvent[]> = {
      M74: [
        { providerId: "y1", minute: 20, type: "yellow_card", teamId: "arg", playerName: "Messi" },
        { providerId: "r1", minute: 80, type: "red_card", teamId: "fra", playerName: "Griezmann" },
      ],
    };

    const pulse = buildTournamentPulseViewModel({
      schedule,
      matchEvents,
      teams,
      isKnockoutActive: true,
    });

    expect(pulse.matchesPlayed).toBe(2);
    expect(pulse.matchesRemaining).toBe(TOTAL_TOURNAMENT_MATCHES - 2);
    expect(pulse.totalGoals).toBe(3);
    expect(pulse.yellowCards).toBe(1);
    expect(pulse.redCards).toBe(1);
    expect(pulse.eventCoverage).toEqual({ completedWithEvents: 1, completedTotal: 2 });
  });

  it("derives knockout teams left from eliminated losers", () => {
    const schedule = [completedKnockout("M74", "arg", "fra", 2, 1)];

    const pulse = buildTournamentPulseViewModel({
      schedule,
      matchEvents: {},
      teams,
      isKnockoutActive: true,
    });

    expect(pulse.teamsLeft).toBe(KNOCKOUT_FIELD_TEAMS - 1);
    expect(pulse.teamsLeftLabel).toBe("In knockout");
  });
});
