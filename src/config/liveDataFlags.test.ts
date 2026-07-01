import { describe, expect, it, beforeEach } from "vitest";
import {
  LIVE_DATA_FLAGS,
  setSseConnectionState,
  shouldRunPollFallback,
} from "./liveDataFlags";
import type { MergedMatch } from "../types";

function liveMatch(): MergedMatch {
  const kickoff = Date.parse("2026-06-30T21:00:00Z");
  return {
    id: "M78",
    date: new Date(kickoff).toISOString(),
    kickoffMs: kickoff,
    homeTeamId: "fra",
    awayTeamId: "swe",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    clockMinute: 50,
  };
}

describe("shouldRunPollFallback", () => {
  beforeEach(() => {
    setSseConnectionState(false);
  });

  it("polls during active live windows even when SSE is connected", () => {
    setSseConnectionState(true);
    expect(LIVE_DATA_FLAGS.pollFallbackOnly).toBe(true);
    expect(shouldRunPollFallback([liveMatch()])).toBe(true);
  });

  it("skips polling outside live windows when SSE is healthy", () => {
    setSseConnectionState(true);
    expect(
      shouldRunPollFallback([
        {
          ...liveMatch(),
          status: "scheduled",
          date: "2027-06-01T12:00:00Z",
          kickoffMs: Date.parse("2027-06-01T12:00:00Z"),
          clockMinute: undefined,
        },
      ])
    ).toBe(false);
  });
});
