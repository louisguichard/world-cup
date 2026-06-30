import { describe, expect, it } from "vitest";
import type { MergedMatch } from "../types";
import {
  isLightPoll,
  pollIntervalMs,
  POLL_IDLE_MS,
  POLL_LIVE_MS,
  shouldRunHeavyPoll,
  smartPollIntervalMs,
} from "./pollPolicy";

function makeMatch(overrides: Partial<MergedMatch> & Pick<MergedMatch, "id" | "date">): MergedMatch {
  const kickoffMs = overrides.kickoffMs ?? Date.parse(overrides.date);
  return {
    homeTeamId: "usa",
    awayTeamId: "mex",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    kickoffMs: Number.isNaN(kickoffMs) ? undefined : kickoffMs,
    ...overrides,
  };
}

describe("pollPolicy legacy shims", () => {
  it("uses 15s when live", () => {
    expect(pollIntervalMs(true)).toBe(POLL_LIVE_MS);
  });

  it("uses 5min when idle", () => {
    expect(pollIntervalMs(false)).toBe(POLL_IDLE_MS);
  });

  it("light poll only when idle", () => {
    expect(isLightPoll(false)).toBe(true);
    expect(isLightPoll(true)).toBe(false);
  });
});

describe("smartPollIntervalMs", () => {
  const kickoff = Date.parse("2026-06-15T18:00:00.000Z");

  it("rests at idle interval when all matches are dormant", () => {
    const now = kickoff - 2 * 60 * 60 * 1000;
    const result = smartPollIntervalMs(
      [makeMatch({ id: "m1", date: new Date(kickoff).toISOString(), status: "scheduled" })],
      now
    );
    expect(result.intervalMs).toBe(POLL_IDLE_MS);
    expect(result.phase).toBe("idle");
  });

  it("uses imminent interval before kickoff", () => {
    const now = kickoff - 10 * 60 * 1000;
    const result = smartPollIntervalMs(
      [makeMatch({ id: "m1", date: new Date(kickoff).toISOString(), status: "scheduled" })],
      now
    );
    expect(result.intervalMs).toBe(60_000);
    expect(result.phase).toBe("imminent");
  });

  it("uses live interval during active play", () => {
    const now = kickoff + 30 * 60 * 1000;
    const result = smartPollIntervalMs(
      [
        makeMatch({
          id: "m1",
          date: new Date(kickoff).toISOString(),
          status: "live",
          clockMinute: 30,
        }),
      ],
      now
    );
    expect(result.intervalMs).toBe(15_000);
    expect(result.phase).toBe("live_first");
  });
});

describe("shouldRunHeavyPoll", () => {
  const kickoff = Date.parse("2026-06-15T18:00:00.000Z");

  it("is false during halftime and imminent", () => {
    const ht = kickoff + 45 * 60 * 1000;
    expect(
      shouldRunHeavyPoll(
        [
          makeMatch({
            id: "m1",
            date: new Date(kickoff).toISOString(),
            status: "live",
            clockMinute: 45,
          }),
        ],
        ht
      )
    ).toBe(false);

    const imminent = kickoff - 5 * 60 * 1000;
    expect(
      shouldRunHeavyPoll(
        [makeMatch({ id: "m1", date: new Date(kickoff).toISOString(), status: "scheduled" })],
        imminent
      )
    ).toBe(false);
  });

  it("is false when kickoff passed but status is still scheduled", () => {
    const now = kickoff + 5 * 60 * 1000;
    expect(
      shouldRunHeavyPoll(
        [makeMatch({ id: "m1", date: new Date(kickoff).toISOString(), status: "scheduled" })],
        now
      )
    ).toBe(false);
  });

  it("is true during live_first", () => {
    const now = kickoff + 20 * 60 * 1000;
    expect(
      shouldRunHeavyPoll(
        [
          makeMatch({
            id: "m1",
            date: new Date(kickoff).toISOString(),
            status: "live",
            clockMinute: 20,
          }),
        ],
        now
      )
    ).toBe(true);
  });
});
