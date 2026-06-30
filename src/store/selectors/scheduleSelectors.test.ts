import { describe, expect, it, beforeEach } from "vitest";
import { buildScheduleOverlayFingerprint } from "./scheduleSelectors";
import {
  getMaterializedScheduleBundle,
  resetMaterializedScheduleCache,
} from "../../lib/materializedScheduleCache";
import type { MergedMatch } from "../../types";

describe("buildScheduleOverlayFingerprint", () => {
  it("ignores live clock fields so minute ticks do not invalidate schedule memo", () => {
    const base: MergedMatch = {
      id: "espn-1",
      matchId: "M1",
      status: "live",
      homeTeamId: "USA",
      awayTeamId: "MEX",
      group: "A",
      homeScore: 1,
      awayScore: 0,
      clockMinute: 12,
      displayClock: "12'",
      date: "2026-06-15T18:00:00Z",
      source: "espn",
      locked: false,
    };
    const ticked: MergedMatch = {
      ...base,
      clockMinute: 45,
      displayClock: "45'",
      lastUpdatedAt: Date.now(),
    };
    const matches = { "espn-1": base };
    const tickedMatches = { "espn-1": ticked };
    expect(buildScheduleOverlayFingerprint(matches, [])).toBe(
      buildScheduleOverlayFingerprint(tickedMatches, [])
    );
  });

  it("changes when a score updates", () => {
    const before: MergedMatch = {
      id: "espn-1",
      matchId: "M1",
      status: "live",
      homeTeamId: "USA",
      awayTeamId: "MEX",
      group: "A",
      homeScore: 1,
      awayScore: 0,
      date: "2026-06-15T18:00:00Z",
      source: "espn",
      locked: false,
    };
    const after: MergedMatch = { ...before, homeScore: 2 };
    expect(buildScheduleOverlayFingerprint({ "espn-1": before }, [])).not.toBe(
      buildScheduleOverlayFingerprint({ "espn-1": after }, [])
    );
  });
});

describe("materializedScheduleCache", () => {
  beforeEach(() => {
    resetMaterializedScheduleCache();
  });

  it("reuses bundle on clock-only live updates", () => {
    const teams = {
      USA: {
        id: "USA",
        name: "USA",
        shortName: "USA",
        abbreviation: "USA",
        group: "A" as const,
        confederation: "CONCACAF" as const,
        flagUrl: "",
      },
    };
    const base: MergedMatch = {
      id: "espn-1",
      matchId: "M1",
      status: "live",
      homeTeamId: "USA",
      awayTeamId: "MEX",
      group: "A",
      homeScore: 1,
      awayScore: 0,
      clockMinute: 12,
      date: "2026-06-15T18:00:00Z",
      source: "espn",
      locked: false,
    };
    const live1 = { "espn-1": base };
    const live2 = { "espn-1": { ...base, clockMinute: 44, displayClock: "44'" } };

    const bundle1 = getMaterializedScheduleBundle(teams, live1, []);
    const bundle2 = getMaterializedScheduleBundle(teams, live2, []);
    expect(bundle1).toBe(bundle2);
  });
});
