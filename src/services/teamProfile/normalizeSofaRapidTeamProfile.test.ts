import { describe, expect, it } from "vitest";
import {
  normalizeSofaRapidEvents,
  normalizeSofaRapidRankings,
  normalizeSofaRapidSquad,
  normalizeSofaRapidStatistics,
  normalizeSofaRapidTeamDetails,
} from "./normalizeSofaRapidTeamProfile";

describe("normalizeSofaRapidTeamProfile", () => {
  it("normalizes team detail", () => {
    const d = normalizeSofaRapidTeamDetails({
      team: { id: 4748, name: "Brazil", nameCode: "BRA", manager: { name: "Coach" } },
    });
    expect(d?.name).toBe("Brazil");
    expect(d?.managerName).toBe("Coach");
  });

  it("normalizes squad rows", () => {
    const players = normalizeSofaRapidSquad({
      players: [{ player: { id: 1, name: "A", jerseyNumber: "10", team: { name: "Club" } } }],
    });
    expect(players[0].clubName).toBe("Club");
  });

  it("normalizes rankings", () => {
    expect(
      normalizeSofaRapidRankings({ rankings: [{ team: { ranking: 6 } }] })
    ).toBe(6);
  });

  it("normalizes events", () => {
    const events = normalizeSofaRapidEvents({
      events: [
        {
          id: 1,
          startTimestamp: 1_700_000_000,
          homeTeam: { name: "Brazil" },
          awayTeam: { name: "France" },
          homeScore: { current: 2 },
          awayScore: { current: 1 },
        },
      ],
    });
    expect(events[0].homeScore).toBe(2);
  });

  it("normalizes statistics", () => {
    const stats = normalizeSofaRapidStatistics({ statistics: { goalsScored: 7 } });
    expect(stats?.goalsScored).toBe(7);
  });
});
