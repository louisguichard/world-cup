import { describe, expect, it } from "vitest";
import { getMatchPhase, getPhaseInterval } from "./matchLifecycle";

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

  it("returns live_first when overdue but not yet live status", () => {
    const now = KICKOFF + 5 * 60 * 1000;
    expect(getMatchPhase({ kickoffMs: KICKOFF, status: "scheduled" }, now)).toBe("live_first");
  });

  it("maps live clock minutes to phases", () => {
    const base = { kickoffMs: KICKOFF, status: "live" as const };
    expect(getMatchPhase({ ...base, clockMinute: 20 }, KICKOFF)).toBe("live_first");
    expect(getMatchPhase({ ...base, clockMinute: 45 }, KICKOFF)).toBe("halftime");
    expect(getMatchPhase({ ...base, clockMinute: 60 }, KICKOFF)).toBe("live_second");
    expect(getMatchPhase({ ...base, clockMinute: 92 }, KICKOFF)).toBe("extra_time");
  });

  it("returns post_match shortly after completed, then locked", () => {
    const completed = { kickoffMs: KICKOFF, status: "completed" as const };
    const justEnded = KICKOFF + 115 * 60 * 1000 + 5 * 60 * 1000;
    const longAfter = KICKOFF + 115 * 60 * 1000 + 50 * 60 * 1000;
    expect(getMatchPhase(completed, justEnded)).toBe("post_match");
    expect(getMatchPhase(completed, longAfter)).toBe("locked");
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
