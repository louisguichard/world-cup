import { describe, expect, it } from "vitest";
import type { MergedMatch } from "../types";
import { matchLiveSnapshot, mergeLiveMatchRecords } from "./dataFreshness";

function baseMatch(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "m1",
    date: "2026-06-15T18:00:00Z",
    homeTeamId: "usa",
    awayTeamId: "mex",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    ...overrides,
  };
}

describe("matchLiveSnapshot", () => {
  it("captures live-relevant fields only", () => {
    const snap = matchLiveSnapshot(baseMatch({ clockMinute: 42, displayClock: "42'" }));
    expect(snap.status).toBe("live");
    expect(snap.homeScore).toBe(1);
    expect(snap.clockMinute).toBe(42);
    expect(snap.displayClock).toBe("42'");
  });
});

describe("mergeLiveMatchRecords", () => {
  it("returns changed=false when snapshots match", () => {
    const existing = { m1: baseMatch() };
    const incoming = { m1: baseMatch({ venue: "MetLife Stadium" }) };
    const { merged, changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(false);
    expect(merged).toBe(existing);
  });

  it("returns changed=true when score updates", () => {
    const existing = { m1: baseMatch({ homeScore: 1 }) };
    const incoming = { m1: baseMatch({ homeScore: 2 }) };
    const { merged, changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(true);
    expect(merged.m1.homeScore).toBe(2);
  });

  it("preserves penaltyShootout when incoming poll omits it", () => {
    const shootout = { home: [], away: [], homeScore: 4, awayScore: 3 };
    const existing = {
      m1: baseMatch({
        status: "completed",
        homeScore: 1,
        awayScore: 1,
        penaltyShootout: shootout,
        decidedByPenalties: true,
      }),
    };
    const incoming = {
      m1: baseMatch({
        status: "completed",
        homeScore: 1,
        awayScore: 1,
        lastUpdatedAt: "2026-06-15T20:00:00Z",
      }),
    };
    const { merged, changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(true);
    expect(merged.m1.penaltyShootout).toEqual(shootout);
    expect(merged.m1.decidedByPenalties).toBe(true);
  });

  it("returns changed=true when match count differs", () => {
    const existing = { m1: baseMatch() };
    const incoming = { m1: baseMatch(), m2: baseMatch({ id: "m2" }) };
    const { changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(true);
  });

  it("returns changed=true when status flips to completed", () => {
    const existing = { m1: baseMatch({ status: "live" }) };
    const incoming = { m1: baseMatch({ status: "completed" }) };
    const { changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(true);
  });

  it("does not downgrade locked completed rows on poll merge", () => {
    const existing = {
      M76: baseMatch({
        id: "M76",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 2,
      }),
    };
    const incoming = {
      M76: baseMatch({
        id: "M76",
        status: "completed",
        locked: false,
        homeScore: 2,
        awayScore: 1,
      }),
    };

    const { merged, changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(false);
    expect(merged.M76?.locked).toBe(true);
    expect(merged.M76?.homeScore).toBe(1);
    expect(merged.M76?.awayScore).toBe(2);
  });

  it("keeps locked finals when incoming poll omits the key", () => {
    const existing = {
      M76: baseMatch({
        id: "M76",
        status: "completed",
        locked: true,
        homeScore: 1,
        awayScore: 2,
      }),
    };
    const incoming = {
      M78: baseMatch({ id: "M78", status: "live", homeScore: 0, awayScore: 0 }),
    };

    const { merged, changed } = mergeLiveMatchRecords(existing, incoming);
    expect(changed).toBe(true);
    expect(merged.M76?.locked).toBe(true);
    expect(merged.M78?.status).toBe("live");
  });
});
