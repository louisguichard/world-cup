import { describe, expect, it } from "vitest";
import type { BracketMatch, MergedMatch, Team } from "../../types";
import {
  resolveDownstreamSlotDisplay,
  resolveFeederMatchDisplay,
} from "./resolveLiveBracketContext";

const teams: Record<string, Team> = {
  ned: { id: "ned", name: "Netherlands", shortName: "NED", abbreviation: "NED", group: "F", rating: 85 },
  mar: { id: "mar", name: "Morocco", shortName: "MAR", abbreviation: "MAR", group: "C", rating: 82 },
  fra: { id: "fra", name: "France", shortName: "FRA", abbreviation: "FRA", group: "I", rating: 90 },
};

describe("resolveLiveBracketContext", () => {
  it("prefers locked sibling live row over stale bracket projection", () => {
    const siblingBracket: BracketMatch = {
      id: "M76",
      stage: "R32",
      label: "M76",
      homeTeamId: "ned",
      awayTeamId: "mar",
      homeSeedLabel: "1E",
      awaySeedLabel: "3D",
      homeScore: 2,
      awayScore: 1,
      winnerTeamId: "ned",
      source: "simulated",
    };

    const liveMatches: Record<string, MergedMatch> = {
      M76: {
        id: "M76",
        matchId: "M76",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 2,
        homeConduct: 0,
        awayConduct: 0,
        source: "espn",
      },
    };

    const display = resolveFeederMatchDisplay("M76", siblingBracket, liveMatches, teams);
    expect(display.homeScore).toBe(1);
    expect(display.awayScore).toBe(2);
    expect(display.winnerTeamId).toBe("mar");
  });

  it("applies locked feeder winner to downstream R16 slot", () => {
    const r16: BracketMatch = {
      id: "M91",
      stage: "R16",
      label: "M91",
      homeTeamId: "ned",
      awayTeamId: "fra",
      homeSeedLabel: "W76",
      awaySeedLabel: "W78",
      source: "simulated",
    };

    const liveMatches: Record<string, MergedMatch> = {
      M76: {
        id: "M76",
        matchId: "M76",
        homeTeamId: "ned",
        awayTeamId: "mar",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 2,
        homeConduct: 0,
        awayConduct: 0,
        source: "espn",
      },
    };

    const display = resolveDownstreamSlotDisplay(r16, liveMatches, teams);
    expect(display.homeTeamId).toBe("mar");
    expect(display.homeTeamId).not.toBe("ned");
  });
});
