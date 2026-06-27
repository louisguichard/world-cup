import { describe, expect, it } from "vitest";
import type { MatchEvent, MergedMatch } from "../types";
import { aggregateTournamentStats } from "./aggregateTournamentStats";

const baseMatch = (id: string, home: string, away: string): MergedMatch => ({
  id,
  matchId: id,
  date: "2026-06-15T18:00:00Z",
  homeTeamId: home,
  awayTeamId: away,
  status: "completed",
  homeScore: 2,
  awayScore: 1,
  homeConduct: 0,
  awayConduct: 0,
  locked: true,
  source: "manual",
});

const goal = (overrides: Partial<MatchEvent>): MatchEvent => ({
  providerId: "g1",
  minute: 10,
  type: "goal",
  teamId: "bra",
  playerName: "Neymar",
  ...overrides,
});

describe("aggregateTournamentStats", () => {
  it("aggregates goals and assists across matches", () => {
    const matches = [baseMatch("M1", "bra", "arg"), baseMatch("M2", "fra", "usa")];
    const matchEvents = {
      M1: [
        goal({ providerId: "a", playerName: "Neymar", assistName: "Vinicius Jr" }),
        goal({ providerId: "b", playerName: "Neymar", minute: 55 }),
      ],
      M2: [goal({ providerId: "c", teamId: "fra", playerName: "Mbappé" })],
    };

    const { topScorers, topAssists } = aggregateTournamentStats({ matches, matchEvents });

    expect(topScorers[0]?.player.displayName).toBe("Neymar");
    expect(topScorers[0]?.value).toBe(2);
    expect(topAssists[0]?.player.displayName).toBe("Vinicius Jr");
    expect(topAssists[0]?.value).toBe(1);
  });
});
