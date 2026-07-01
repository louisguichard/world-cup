import { describe, expect, it } from "vitest";
import {
  selectActiveCareerLeaders,
  selectAllTimeCareerLeaders,
  selectGoldenBootRace,
  selectTopScorers2026,
} from "./tournamentStatsSelectors";
import type { MatchEvent, MergedMatch } from "../../types";

const match: MergedMatch = {
  id: "M1",
  matchId: "M1",
  homeTeamId: "arg",
  awayTeamId: "fra",
  date: "2026-06-15",
  status: "completed",
  locked: true,
  source: "espn",
  homeScore: 3,
  awayScore: 0,
};

const matchEvents: Record<string, MatchEvent[]> = {
  M1: [
    { providerId: "m1", minute: 12, type: "goal", teamId: "arg", playerName: "Lionel Messi" },
    { providerId: "m2", minute: 34, type: "goal", teamId: "arg", playerName: "Lionel Messi" },
    { providerId: "m3", minute: 78, type: "goal", teamId: "arg", playerName: "Lionel Messi" },
    { providerId: "k1", minute: 55, type: "goal", teamId: "fra", playerName: "Kylian Mbappé" },
  ],
};

const state = {
  liveMatches: { M1: match },
  matchEvents,
  teams: {},
};

describe("tournamentStatsSelectors", () => {
  it("selectTopScorers2026 ranks by goals", () => {
    const scorers = selectTopScorers2026(state);
    expect(scorers[0]?.player.displayName).toBe("Lionel Messi");
    expect(scorers[0]?.value).toBe(3);
    expect(scorers[1]?.player.displayName).toBe("Kylian Mbappé");
  });

  it("selectGoldenBootRace applies minimum goals threshold", () => {
    expect(selectGoldenBootRace(state, 3)).toHaveLength(1);
    expect(selectGoldenBootRace(state, 1)).toHaveLength(2);
  });

  it("selectActiveCareerLeaders merges live goals for active reference players", () => {
    const leaders = selectActiveCareerLeaders(state, 10);
    const messi = leaders.find((row) => row.reference.player_name === "Lionel Messi");
    expect(messi?.goals2026).toBe(3);
    expect(messi?.careerTotal).toBe(16);
    expect(leaders.some((row) => row.reference.player_name === "Jürgen Klinsmann")).toBe(false);
  });

  it("selectAllTimeCareerLeaders includes retired all-time leaders", () => {
    const leaders = selectAllTimeCareerLeaders(state, 5);
    const names = leaders.map((row) => row.reference.player_name);
    expect(names).toContain("Miroslav Klose");
    expect(names).toContain("Lionel Messi");
    expect(leaders[0]?.careerTotal).toBeGreaterThanOrEqual(16);
  });
});
