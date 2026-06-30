import { describe, expect, it } from "vitest";
import {
  getMatchPhase,
  getPhaseInterval,
  isActivePhase,
  isMatchEffectivelyLive,
  isMergedMatchInActivePhase,
  PRE_KICKOFF_LIVE_TOLERANCE_MS,
} from "./matchLifecycle";

const KICKOFF = Date.parse("2026-06-15T18:00:00.000Z");

describe("getMatchPhase", () => {
  it("returns locked when match.locked is true", () => {
    expect(
      getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled", locked: true }, KICKOFF)
    ).toBe("locked");
  });

  it("returns dormant when kickoff is more than 15 min away", () => {
    const now = KICKOFF - 20 * 60 * 1000;
    expect(getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled" }, now)).toBe("dormant");
  });

  it("returns imminent within 15 min of kickoff", () => {
    const now = KICKOFF - 10 * 60 * 1000;
    expect(getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled" }, now)).toBe("imminent");
  });

  it("returns imminent when overdue but API status is still scheduled", () => {
    const now = KICKOFF + 5 * 60 * 1000;
    expect(getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled" }, now)).toBe("imminent");
  });

  it("returns live_first when overdue and status is not scheduled", () => {
    const now = KICKOFF + 5 * 60 * 1000;
    expect(getMatchPhase({ kickoffMs: KICKOFF, status: "live", clockMinute: 5 }, now)).toBe(
      "live_first"
    );
  });

  it("maps live clock minutes to phases for knockout matches", () => {
    const base = { kickoffMs: KICKOFF, status: "live" as const, matchId: "M76" };
    expect(getMatchPhase({ ...base, clockMinute: 20 }, KICKOFF)).toBe("live_first");
    expect(getMatchPhase({ ...base, clockMinute: 45 }, KICKOFF)).toBe("halftime");
    expect(getMatchPhase({ ...base, clockMinute: 60 }, KICKOFF)).toBe("live_second");
    expect(getMatchPhase({ ...base, clockMinute: 92 }, KICKOFF)).toBe("extra_time");
  });

  it("never assigns extra_time to group-stage matches at 90+ minutes", () => {
    const base = { kickoffMs: KICKOFF, status: "live" as const, group: "E" as const };
    expect(getMatchPhase({ ...base, clockMinute: 92 }, KICKOFF)).toBe("live_second");
    expect(getMatchPhase({ ...base, clockMinute: 95 }, KICKOFF)).toBe("live_second");
  });

  it("returns post_match shortly after group completion, then locked", () => {
    const completed = { kickoffMs: KICKOFF, status: "completed" as const, group: "E" as const };
    const justEnded = KICKOFF + 100 * 60 * 1000 + 5 * 60 * 1000;
    const longAfter = KICKOFF + 100 * 60 * 1000 + 50 * 60 * 1000;
    expect(getMatchPhase(completed, justEnded)).toBe("post_match");
    expect(getMatchPhase(completed, longAfter)).toBe("locked");
  });

  it("returns post_match shortly after knockout completion, then locked", () => {
    const completed = { kickoffMs: KICKOFF, status: "completed" as const, matchId: "M76" };
    const justEnded = KICKOFF + 130 * 60 * 1000 + 5 * 60 * 1000;
    const longAfter = KICKOFF + 130 * 60 * 1000 + 50 * 60 * 1000;
    expect(getMatchPhase(completed, justEnded)).toBe("post_match");
    expect(getMatchPhase(completed, longAfter)).toBe("locked");
  });

  it("rejects upstream live status more than 2 min before kickoff", () => {
    const franceSwedenKickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const thirtyTwoMinBefore = Date.parse("2026-06-30T17:28:00.000Z");
    const live = { kickoffMs: franceSwedenKickoff, status: "live" as const, clockMinute: 0 };
    expect(getMatchPhase(live, thirtyTwoMinBefore)).toBe("dormant");
    expect(isMatchEffectivelyLive(live, thirtyTwoMinBefore)).toBe(false);
  });

  it("allows live status within 2 min of kickoff", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const oneMinBefore = kickoff - 60 * 1000;
    const live = { kickoffMs: kickoff, status: "live" as const, clockMinute: 0 };
    expect(getMatchPhase(live, oneMinBefore)).toBe("live_first");
    expect(isMatchEffectivelyLive(live, oneMinBefore)).toBe(true);
  });

  it("treats premature live within 15 min as imminent not live_first", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const tenMinBefore = kickoff - 10 * 60 * 1000;
    const live = { kickoffMs: kickoff, status: "live" as const, clockMinute: 0 };
    expect(getMatchPhase(live, tenMinBefore)).toBe("imminent");
    expect(isMatchEffectivelyLive(live, tenMinBefore)).toBe(false);
    expect(tenMinBefore).toBeLessThan(kickoff - PRE_KICKOFF_LIVE_TOLERANCE_MS);
  });

  it("maps half_time period to halftime even when status is scheduled", () => {
    const now = KICKOFF + 50 * 60 * 1000;
    expect(
      getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled", period: "half_time" }, now)
    ).toBe("halftime");
  });

  it("maps interrupted in-play status to live_first from clock", () => {
    const now = KICKOFF + 30 * 60 * 1000;
    expect(
      getMatchPhase({ kickoffMs: KICKOFF, status: "interrupted", clockMinute: 28 }, now)
    ).toBe("live_first");
  });
});

describe("isActivePhase / isMergedMatchInActivePhase", () => {
  it("includes imminent, in-play, and post_match phases", () => {
    expect(isActivePhase("imminent")).toBe(true);
    expect(isActivePhase("halftime")).toBe(true);
    expect(isActivePhase("post_match")).toBe(true);
    expect(isActivePhase("dormant")).toBe(false);
    expect(isActivePhase("locked")).toBe(false);
  });

  it("surfaces halftime when ESPN leaves status as scheduled", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const halftime = kickoff + 50 * 60 * 1000;
    expect(
      isMergedMatchInActivePhase(
        { date: new Date(kickoff).toISOString(), status: "scheduled", period: "half_time" },
        halftime
      )
    ).toBe(true);
  });

  it("surfaces interrupted matches still in progress", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    const now = kickoff + 30 * 60 * 1000;
    expect(
      isMergedMatchInActivePhase(
        { date: new Date(kickoff).toISOString(), status: "interrupted", clockMinute: 28 },
        now
      )
    ).toBe(true);
  });

  it("excludes locked matches", () => {
    const kickoff = Date.parse("2026-06-30T18:00:00.000Z");
    expect(
      isMergedMatchInActivePhase(
        { date: new Date(kickoff).toISOString(), status: "live", clockMinute: 20, locked: true },
        kickoff + 20 * 60 * 1000
      )
    ).toBe(false);
  });
});

describe("getPhaseInterval", () => {
  it("returns Infinity for dormant and locked", () => {
    expect(getPhaseInterval("dormant")).toBe(Infinity);
    expect(getPhaseInterval("locked")).toBe(Infinity);
  });

  it("returns expected intervals for active phases", () => {
    expect(getPhaseInterval("live_first")).toBe(15_000);
    expect(getPhaseInterval("halftime")).toBe(60_000);
    expect(getPhaseInterval("extra_time")).toBe(10_000);
    expect(getPhaseInterval("post_match")).toBe(120_000);
  });
});
