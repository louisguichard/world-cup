import { describe, expect, it } from "vitest";
import { applyLiveScore } from "../services/DataMerger";
import type { MergedMatch } from "../types";

describe("applyLiveScore", () => {
  const base: MergedMatch = {
    id: "1",
    date: "2026-06-11T19:00:00Z",
    homeTeamId: "h",
    awayTeamId: "a",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "sofascore",
    dataSource: "sofascore"
  };

  it("manual survives poll", () => {
    const manual = { ...base, source: "manual" as const, homeScore: 2 };
    const result = applyLiveScore(manual, { homeScore: 3 }, "espn");
    expect(result.homeScore).toBe(2);
  });

  it("sofascore beats espn", () => {
    const result = applyLiveScore(base, { homeScore: 2 }, "espn");
    expect(result.homeScore).toBe(1);
  });
});
