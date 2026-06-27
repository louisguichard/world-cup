import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  BOOT_CACHE_VERSION,
  BOOT_TEAMS_CACHE_KEY,
  hydrateBootFromCache,
} from "./bootCache";
import { LIVE_MATCH_CACHE_KEY } from "./liveMatchCache";
import { STANDINGS_CACHE_KEY } from "./standingsCache";

describe("bootCache", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports BOOT_CACHE_VERSION 3", () => {
    expect(BOOT_CACHE_VERSION).toBe(3);
  });

  it("uses versioned cache keys", () => {
    expect(BOOT_TEAMS_CACHE_KEY).toBe("wc-boot-teams-v3");
    expect(LIVE_MATCH_CACHE_KEY).toBe("wc-live-matches-v3");
    expect(STANDINGS_CACHE_KEY).toBe("wc-standings-v3");
  });

  it("rejects stale v1 team cache and purges legacy keys", () => {
    localStorage.setItem(
      "wc-boot-teams-v1",
      JSON.stringify({ version: 1, savedAt: "2020-01-01", teams: { bra: { id: "bra" } } })
    );

    const hydration = hydrateBootFromCache();

    expect(hydration.teams).toEqual({});
    expect(localStorage.getItem("wc-boot-teams-v1")).toBeNull();
  });

  it("rejects mismatched version in current key", () => {
    localStorage.setItem(
      BOOT_TEAMS_CACHE_KEY,
      JSON.stringify({ version: 1, savedAt: "2020-01-01", teams: { bra: { id: "bra" } } })
    );

    const hydration = hydrateBootFromCache();

    expect(hydration.teams).toEqual({});
    expect(localStorage.getItem(BOOT_TEAMS_CACHE_KEY)).toBeNull();
  });

  it("hydrates v3 team cache", () => {
    localStorage.setItem(
      BOOT_TEAMS_CACHE_KEY,
      JSON.stringify({
        version: BOOT_CACHE_VERSION,
        savedAt: new Date().toISOString(),
        teams: { bra: { id: "bra", name: "Brazil" } },
      })
    );

    const hydration = hydrateBootFromCache();

    expect(hydration.teams.bra?.name).toBe("Brazil");
    expect(hydration.hadCache).toBe(true);
  });
});
