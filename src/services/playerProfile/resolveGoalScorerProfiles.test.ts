import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MatchEvent } from "../../types";
import {
  resolveGoalScorerProfilesSync,
} from "./resolveGoalScorerProfiles";

vi.mock("../WorldCup2026Client", () => ({
  isWorldCup2026Disabled: () => false,
  lookupWc2026Player: vi.fn(({ playerName }: { playerName: string }) => {
    if (playerName === "Known Scorer") {
      return { id: "9", fullName: "Known Scorer", image: "https://example.com/scorer.jpg" };
    }
    return undefined;
  }),
  fetchTeamPlayers: vi.fn(),
  getWc2026TeamIdFromCache: () => undefined,
  resolveWc2026TeamId: async () => undefined,
}));

vi.mock("../../config/apiFlags", () => ({
  isApiEnabled: () => true,
}));

describe("resolveGoalScorerProfilesSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes photoUrl from cached roster index", () => {
    const events: MatchEvent[] = [
      {
        providerId: "g1",
        type: "goal",
        minute: 22,
        playerName: "Known Scorer",
        teamId: "mex",
      },
    ];

    const profiles = resolveGoalScorerProfilesSync({ events, allMatchEvents: { m1: events } });
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.photoUrl).toBe("https://example.com/scorer.jpg");
    expect(profiles[0]?.displayName).toBe("Known Scorer");
  });
});
