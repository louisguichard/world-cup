import { describe, expect, it, vi, beforeEach } from "vitest";
import type { MatchEvent } from "../../types";
import {
  enrichEventPlayerPhotos,
  photoUrlFromPlayer,
  resolveEventPhotosSync,
} from "./resolveEventPlayerPhotos";

vi.mock("../WorldCup2026Client", () => ({
  isWorldCup2026Disabled: () => false,
  lookupWc2026Player: vi.fn(({ playerName }: { playerName: string }) => {
    if (playerName === "Known Player") {
      return { id: "1", fullName: "Known Player", image: "https://example.com/p.jpg" };
    }
    return undefined;
  }),
  fetchTeamPlayers: vi.fn(async () => [
    { id: "2", fullName: "Roster Player", image: "https://example.com/r.jpg" },
  ]),
  getWc2026TeamIdFromCache: () => "624",
  resolveWc2026TeamId: async () => "624",
}));

vi.mock("../../config/apiFlags", () => ({
  isApiEnabled: () => true,
}));

vi.mock("../../data/playerDatabase", () => ({
  ensurePlayerDatabase: async () => undefined,
  hydratePlayerImageFromDatabase: async () => undefined,
}));

describe("resolveEventPlayerPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads image from player record", () => {
    expect(
      photoUrlFromPlayer({ id: "1", fullName: "A", image: " https://x.com/a.jpg " })
    ).toBe("https://x.com/a.jpg");
    expect(photoUrlFromPlayer({ id: "1", fullName: "A", image: "" })).toBeUndefined();
  });

  it("sync-resolves from local player index", () => {
    const events: MatchEvent[] = [
      {
        providerId: "g1",
        type: "goal",
        minute: 12,
        playerName: "Known Player",
        teamId: "MEX",
      },
    ];
    expect(resolveEventPhotosSync(events).g1).toBe("https://example.com/p.jpg");
  });

  it("enriches missing photos from team roster", async () => {
    const events: MatchEvent[] = [
      {
        providerId: "g2",
        type: "goal",
        minute: 44,
        playerName: "Roster Player",
        teamId: "home-1",
      },
    ];
    const photos = await enrichEventPlayerPhotos({
      events,
      homeTeam: { id: "home-1", name: "Algeria", shortName: "ALG", abbreviation: "ALG" },
    });
    expect(photos.g2).toBe("https://example.com/r.jpg");
  });
});
