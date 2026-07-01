import { describe, expect, it } from "vitest";
import { applyLiveScore, enrichFromSofaScore } from "../services/DataMerger";
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

  it("result-final locked survives poll from lower-precedence source", () => {
    const locked = { ...base, locked: true, status: "completed" as const, homeScore: 2, awayScore: 1 };
    const result = applyLiveScore(locked, { homeScore: 0, awayScore: 0 }, "espn");
    expect(result.homeScore).toBe(2);
    expect(result.awayScore).toBe(1);
  });

  it("allows ESPN to refresh in-play rows that were incorrectly locked", () => {
    const locked = {
      ...base,
      source: "espn" as const,
      dataSource: "espn" as const,
      locked: true,
      homeScore: 0,
      awayScore: 0,
      clockMinute: 45,
      period: "full_time" as const,
    };
    const result = applyLiveScore(locked, {
      homeScore: 2,
      awayScore: 0,
      clockMinute: 52,
      period: "second_half",
      status: "live",
    }, "espn");
    expect(result.homeScore).toBe(2);
    expect(result.period).toBe("second_half");
    expect(result.locked).toBe(false);
  });

  it("sofascore beats espn when applied via applyLiveScore", () => {
    const result = applyLiveScore(base, { homeScore: 2 }, "espn");
    expect(result.homeScore).toBe(1);
  });

  it("preserves ESPN clock fields on merge", () => {
    const espn = applyLiveScore(undefined, {
      id: "e1",
      date: "2026-06-11T19:00:00Z",
      homeTeamId: "h",
      awayTeamId: "a",
      status: "live",
      homeScore: 2,
      awayScore: 1,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      clockMinute: 73,
      clockExtra: undefined,
      clockRunning: true,
      displayClock: "73'",
      period: "second_half"
    }, "espn");

    expect(espn.clockMinute).toBe(73);
    expect(espn.displayClock).toBe("73'");
    expect(espn.period).toBe("second_half");
    expect(espn.clockRunning).toBe(true);
  });
});

describe("enrichFromSofaScore", () => {
  const espnLive: MergedMatch = {
    id: "espn-1",
    date: "2026-06-11T19:00:00Z",
    homeTeamId: "h",
    awayTeamId: "a",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    dataSource: "espn",
    espnEventId: "espn-1",
    clockMinute: 45,
    displayClock: "45'",
    period: "first_half"
  };

  it("enriches scores and sofaEventId without changing source", () => {
    const result = enrichFromSofaScore(espnLive, {
      sofaEventId: "999",
      homeScore: 2,
      awayScore: 1
    });
    expect(result.homeScore).toBe(2);
    expect(result.awayScore).toBe(1);
    expect(result.sofaEventId).toBe("999");
    expect(result.source).toBe("espn");
    expect(result.dataSource).toBe("espn");
  });

  it("no-ops on locked matches", () => {
    const locked = { ...espnLive, locked: true, status: "completed" as const };
    const result = enrichFromSofaScore(locked, { homeScore: 9 });
    expect(result).toBe(locked);
  });

  it("no-ops on completed matches", () => {
    const completed = { ...espnLive, status: "completed" as const, locked: true };
    const result = enrichFromSofaScore(completed, { status: "live", homeScore: 9 });
    expect(result).toBe(completed);
  });

  it("no-ops on manual matches", () => {
    const manual = { ...espnLive, source: "manual" as const };
    const result = enrichFromSofaScore(manual, { homeScore: 9 });
    expect(result).toBe(manual);
  });

  it("does not promote scheduled to live via sofascore status patch", () => {
    const scheduled = { ...espnLive, status: "scheduled" as const, clockMinute: undefined, displayClock: undefined };
    const result = enrichFromSofaScore(scheduled, { status: "live", homeScore: 0, awayScore: 0, displayClock: "0'" });
    expect(result.status).toBe("scheduled");
    expect(result.displayClock).toBe("0'");
  });

  it("never applies live status from secondary enrichment", () => {
    const result = enrichFromSofaScore(espnLive, { status: "live", homeScore: 2 });
    expect(result.status).toBe("live");
    expect(result.homeScore).toBe(2);
  });

  it("coerces premature ESPN live at merge time", () => {
    const kickoff = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const scheduled = {
      id: "M77",
      date: kickoff,
      homeTeamId: "fra",
      awayTeamId: "swe",
      status: "scheduled" as const,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn" as const,
      dataSource: "espn" as const,
    };
    const result = applyLiveScore(scheduled, {
      status: "live",
      homeScore: 0,
      awayScore: 0,
      clockMinute: 0,
      displayClock: "0'",
    }, "espn");
    expect(result.status).toBe("scheduled");
    expect(result.displayClock).toBeUndefined();
  });
});
