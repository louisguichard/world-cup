import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  isGlobalSyncDue,
  isProfileStale,
  readTeamProfileStore,
  upsertTeamProfile,
  writeTeamProfileStore,
  TEAM_PROFILE_CACHE_KEY,
  PROFILE_TTL_MS,
} from "./teamProfileCache";
import type { TeamProfileBundle } from "../types/teamProfile";

const sampleProfile = (abbrev: string): TeamProfileBundle => ({
  abbrev,
  sofaTeamId: 1,
  fetchedAt: new Date().toISOString(),
  details: null,
  players: [],
  statistics: null,
  media: [],
  lastMatches: [],
  nextMatches: [],
  tournamentNames: [],
  unavailable: [],
  source: "sofascore-rapid",
});

describe("teamProfileCache", () => {
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
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks profiles stale after TTL", () => {
    const old = new Date(Date.now() - PROFILE_TTL_MS - 1000).toISOString();
    expect(isProfileStale(old)).toBe(true);
    expect(isProfileStale(new Date().toISOString())).toBe(false);
  });

  it("persists and reads profiles from localStorage", () => {
    const store = {
      version: 2 as const,
      lastGlobalSyncAt: null,
      profiles: { BRA: sampleProfile("BRA") },
    };
    writeTeamProfileStore(store);
    const read = readTeamProfileStore();
    expect(read.profiles.BRA?.abbrev).toBe("BRA");
  });

  it("upserts profiles by abbrev", () => {
    let store = readTeamProfileStore();
    store = upsertTeamProfile(store, sampleProfile("ARG"));
    expect(store.profiles.ARG?.sofaTeamId).toBe(1);
  });

  it("detects global sync due when never synced", () => {
    expect(isGlobalSyncDue(null)).toBe(true);
  });
});
