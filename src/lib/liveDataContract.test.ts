import { describe, expect, it } from "vitest";
import {
  isResultFinalLocked,
  sanitizeLegacyLockedFlag,
  lockedFromEspnStatus,
  shouldRunLivePolling,
} from "./liveDataContract";
import type { MergedMatch } from "../types";

function base(overrides: Partial<MergedMatch> = {}): MergedMatch {
  return {
    id: "M78",
    date: "2026-06-30T21:00:00Z",
    homeTeamId: "fra",
    awayTeamId: "swe",
    status: "live",
    homeScore: 2,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    ...overrides,
  };
}

describe("isResultFinalLocked", () => {
  it("is false for in-play live rows even when locked flag was set incorrectly", () => {
    expect(isResultFinalLocked(base({ locked: true }))).toBe(false);
  });

  it("is true for completed + locked", () => {
    expect(isResultFinalLocked(base({ status: "completed", locked: true }))).toBe(true);
  });

  it("is true for manual overrides", () => {
    expect(isResultFinalLocked(base({ source: "manual", status: "scheduled" }))).toBe(true);
  });
});

describe("sanitizeLegacyLockedFlag", () => {
  it("clears locked on live matches", () => {
    const out = sanitizeLegacyLockedFlag(base({ locked: true }));
    expect(out.locked).toBe(false);
  });

  it("preserves locked on completed matches", () => {
    const out = sanitizeLegacyLockedFlag(base({ status: "completed", locked: true }));
    expect(out.locked).toBe(true);
  });
});

describe("lockedFromEspnStatus", () => {
  it("returns false for live", () => {
    expect(lockedFromEspnStatus("live")).toBe(false);
  });

  it("returns true for completed", () => {
    expect(lockedFromEspnStatus("completed")).toBe(true);
  });
});

describe("shouldRunLivePolling", () => {
  it("returns true when any match is in an active live phase", () => {
    const kickoff = Date.parse("2026-06-30T21:00:00Z");
    const now = kickoff + 50 * 60 * 1000;
    expect(
      shouldRunLivePolling([
        base({
          kickoffMs: kickoff,
          status: "live",
          clockMinute: 50,
        }),
      ])
    ).toBe(true);
    void now;
  });

  it("returns false when all matches are dormant", () => {
    expect(
      shouldRunLivePolling([
        base({
          date: "2027-01-01T12:00:00Z",
          kickoffMs: Date.parse("2027-01-01T12:00:00Z"),
          status: "scheduled",
        }),
      ])
    ).toBe(false);
  });
});
