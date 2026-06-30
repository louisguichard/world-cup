import { describe, expect, it } from "vitest";
import { mergeFifaPublicMatchIntoStore } from "./fifaPublicMatchMerge";
import type { MergedMatch } from "../types";

function shell(id: string): MergedMatch {
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
  };
}

describe("mergeFifaPublicMatchIntoStore", () => {
  it("overlays scores onto existing shell without clobbering venue or espn id", () => {
    const merged: Record<string, MergedMatch> = { M1: shell("M1") };
    const ok = mergeFifaPublicMatchIntoStore(merged, {
      matchNumber: 1,
      idMatch: "fifa-99",
      homeScore: 2,
      awayScore: 1,
      status: "finished",
    });

    expect(ok).toBe(true);
    expect(merged.M1.homeScore).toBe(2);
    expect(merged.M1.awayScore).toBe(1);
    expect(merged.M1.status).toBe("completed");
    expect(merged.M1.fifaMatchId).toBe("fifa-99");
    expect(merged.M1.venue).toBe("Mexico City Stadium, Mexico City");
    expect(merged.M1.espnEventId).toBe("espn-1");
  });

  it("returns false when shell is missing", () => {
    const merged: Record<string, MergedMatch> = {};
    expect(mergeFifaPublicMatchIntoStore(merged, { matchNumber: 99, status: "live" })).toBe(
      false
    );
  });
});
