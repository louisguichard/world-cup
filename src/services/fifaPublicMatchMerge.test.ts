import { describe, expect, it, vi } from "vitest";
import { mergeFifaPublicMatchIntoStore } from "./fifaPublicMatchMerge";
import type { MergedMatch } from "../types";

function shell(id: string, overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id,
    matchId: id,
    date: "2026-06-11T19:00:00.000Z",
    venue: "Mexico City Stadium, Mexico City",
    homeTeamId: "mex",
    awayTeamId: "rsa",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "model",
    espnEventId: "espn-1",
    ...overrides,
  };
}

describe("mergeFifaPublicMatchIntoStore", () => {
  it("overlays scores onto model shell without clobbering venue or espn id", () => {
    const merged: Record<string, MergedMatch> = { M1: shell("M1") };
    const outcome = mergeFifaPublicMatchIntoStore(merged, {
      matchNumber: 1,
      idMatch: "fifa-99",
      homeScore: 2,
      awayScore: 1,
      status: "finished",
    });

    expect(outcome).toBe("applied");
    expect(merged.M1.homeScore).toBe(2);
    expect(merged.M1.awayScore).toBe(1);
    expect(merged.M1.status).toBe("completed");
    expect(merged.M1.fifaMatchId).toBe("fifa-99");
    expect(merged.M1.venue).toBe("Mexico City Stadium, Mexico City");
    expect(merged.M1.espnEventId).toBe("espn-1");
  });

  it("returns unchanged when shell is missing", () => {
    const merged: Record<string, MergedMatch> = {};
    expect(mergeFifaPublicMatchIntoStore(merged, { matchNumber: 99, status: "live" })).toBe(
      "unchanged"
    );
  });

  it("blocks FIFA score overwrite on ESPN completed row", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const merged: Record<string, MergedMatch> = {
      M78: shell("M78", {
        source: "espn",
        status: "completed",
        locked: true,
        homeScore: 3,
        awayScore: 0,
        homeTeamId: "fra",
        awayTeamId: "swe",
      }),
    };

    const outcome = mergeFifaPublicMatchIntoStore(merged, {
      matchNumber: 78,
      homeScore: 1,
      awayScore: 2,
      status: "finished",
    });

    expect(outcome).toBe("skipped");
    expect(merged.M78.homeScore).toBe(3);
    expect(merged.M78.awayScore).toBe(0);
    warnSpy.mockRestore();
  });

  it("blocks conflicting FIFA scores on ESPN live row and logs warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const merged: Record<string, MergedMatch> = {
      M78: shell("M78", {
        source: "espn",
        status: "live",
        homeScore: 2,
        awayScore: 0,
        homeTeamId: "fra",
        awayTeamId: "swe",
      }),
    };

    const outcome = mergeFifaPublicMatchIntoStore(merged, {
      matchNumber: 78,
      homeScore: 1,
      awayScore: 1,
      status: "live",
    });

    expect(outcome).toBe("blocked");
    expect(merged.M78.homeScore).toBe(2);
    expect(merged.M78.awayScore).toBe(0);
    warnSpy.mockRestore();
  });

  it("allows FIFA metadata on ESPN row without changing scores", () => {
    const merged: Record<string, MergedMatch> = {
      M78: shell("M78", {
        source: "espn",
        status: "completed",
        locked: false,
        homeScore: 3,
        awayScore: 0,
      }),
    };

    const outcome = mergeFifaPublicMatchIntoStore(merged, {
      matchNumber: 78,
      idMatch: "fifa-78",
      homeScore: 3,
      awayScore: 0,
      status: "finished",
    });

    expect(outcome).toBe("applied");
    expect(merged.M78.fifaMatchId).toBe("fifa-78");
    expect(merged.M78.homeScore).toBe(3);
    expect(merged.M78.awayScore).toBe(0);
  });
});
