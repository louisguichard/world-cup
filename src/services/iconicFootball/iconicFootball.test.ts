import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapIconicPlayerToPlayerRef } from "./mapIconicPlayer";
import {
  fetchIconicPlayers,
  getPlayerCareer,
  lookupIconicPlayerPhoto,
  lookupIconicPlayerPhotoAsync,
} from "./IconicFootballClient";
import type { IconicFootballPlayer } from "./types";

vi.mock("../../config/apiFlags", () => ({
  isApiEnabled: () => true,
}));

const samplePlayer: IconicFootballPlayer = {
  id: 7,
  known_as: "Messi",
  full_name: "Lionel Andrés Messi",
  img: "https://example.com/messi.png",
  prime_season: "2012-2013",
  prime_position: "RW",
  preferred_foot: "left",
  spd: 93,
  sho: 92,
  pas: 91,
  dri: 95,
  def: 34,
  phy: 65,
  prime_rating: 94,
};

describe("mapIconicPlayer", () => {
  it("maps to PlayerRef with headshotUrl", () => {
    const ref = mapIconicPlayerToPlayerRef(samplePlayer);
    expect(ref.id).toBe("iconic-7");
    expect(ref.displayName).toBe("Lionel Andrés Messi");
    expect(ref.headshotUrl).toBe("https://example.com/messi.png");
  });
});

describe("IconicFootballClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: [samplePlayer],
          meta: { current_page: 1, per_page: 50, total: 1, last_page: 1 },
        }),
      }))
    );
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchIconicPlayers returns parsed players", async () => {
    const players = await fetchIconicPlayers();
    expect(players).toHaveLength(1);
    expect(players[0]?.known_as).toBe("Messi");
  });

  it("lookupIconicPlayerPhotoAsync resolves by full name", async () => {
    const url = await lookupIconicPlayerPhotoAsync("Lionel Messi");
    expect(url).toBe("https://example.com/messi.png");
  });

  it("lookupIconicPlayerPhoto works after index warm", async () => {
    await fetchIconicPlayers();
    expect(lookupIconicPlayerPhoto("Messi")).toBe("https://example.com/messi.png");
  });

  it("getPlayerCareer returns prime stats", async () => {
    const career = await getPlayerCareer("Messi");
    expect(career?.source).toBe("iconicfootball");
    expect(career?.player.prime_rating).toBe(94);
  });
});
