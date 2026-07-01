import { describe, expect, it } from "vitest";
import type { MergedMatch, Team } from "../types";
import { commitLiveMatchStore } from "./commitLiveMatchStore";

function makeTeam(id: string, abbrev: string): Team {
  return {
    id,
    name: id,
    shortName: abbrev,
    abbreviation: abbrev,
    group: "F",
    rating: 80,
  };
}

const teams: Record<string, Team> = {
  ned: makeTeam("ned", "NED"),
  mar: makeTeam("mar", "MAR"),
  ger: makeTeam("ger", "GER"),
};

function lockedMoroccoWin(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "M76",
    matchId: "M76",
    espnEventId: "760488",
    homeTeamId: "ned",
    awayTeamId: "mar",
    date: "2026-06-30T19:00:00Z",
    status: "completed",
    locked: true,
    source: "espn",
    homeScore: 1,
    awayScore: 1,
    penaltyShootout: { homeScore: 2, awayScore: 3 },
    homeConduct: 0,
    awayConduct: 0,
    ...overrides,
  };
}

describe("commitLiveMatchStore", () => {
  it("preserves locked completed knockout when poll sends stale unlocked scores", () => {
    const existing = { M76: lockedMoroccoWin() };
    const incoming: Record<string, MergedMatch> = {
      M76: {
        ...lockedMoroccoWin(),
        locked: false,
        homeScore: 2,
        awayScore: 1,
        penaltyShootout: undefined,
        status: "completed",
      },
    };

    const { merged } = commitLiveMatchStore(existing, incoming, teams);

    expect(merged.M76?.awayTeamId).toBe("mar");
    expect(merged.M76?.locked).toBe(true);
    expect(merged.M76?.penaltyShootout).toMatchObject({ homeScore: 2, awayScore: 3 });
    expect(merged.M76?.homeScore).toBe(1);
    expect(merged.M76?.awayScore).toBe(1);
  });

  it("merges boot penalty enrichment without dropping locked rows omitted from incoming", () => {
    const existing = { M76: lockedMoroccoWin(), M77: lockedMoroccoWin({ id: "M77", matchId: "M77", espnEventId: "760490", homeTeamId: "civ", awayTeamId: "nor", homeScore: 1, awayScore: 2, penaltyShootout: undefined }) };
    const incoming: Record<string, MergedMatch> = {
      M76: {
        ...lockedMoroccoWin(),
        penaltyShootout: { homeScore: 2, awayScore: 3, homeKicks: [], awayKicks: [] },
      },
    };

    const { merged } = commitLiveMatchStore(existing, incoming, teams);

    expect(merged.M76?.locked).toBe(true);
    expect(merged.M77?.locked).toBe(true);
  });

  it("applies new locked results from boot merge over unlocked boot-built rows", () => {
    const existing: Record<string, MergedMatch> = {};
    const cached = { M76: lockedMoroccoWin() };
    const bootBuilt: Record<string, MergedMatch> = {
      M76: {
        ...lockedMoroccoWin(),
        locked: false,
        homeScore: 2,
        awayScore: 1,
        penaltyShootout: undefined,
      },
    };

    const { merged } = commitLiveMatchStore(existing, { ...bootBuilt, ...cached }, teams);

    expect(merged.M76?.locked).toBe(true);
    expect(merged.M76?.penaltyShootout).toMatchObject({ homeScore: 2, awayScore: 3 });
  });

  it("migrates legacy M86 cache key to schedule M76 on commit", () => {
    const existing = {
      M86: lockedMoroccoWin({ id: "M86", matchId: "M86" }),
    };

    const { merged } = commitLiveMatchStore(existing, {}, teams);

    expect(merged.M76?.locked).toBe(true);
    expect(merged.M76?.awayTeamId).toBe("mar");
  });
});
