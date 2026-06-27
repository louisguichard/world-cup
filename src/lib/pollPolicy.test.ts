import { describe, expect, it } from "vitest";
import { isLightPoll, pollIntervalMs, POLL_IDLE_MS, POLL_LIVE_MS } from "./pollPolicy";

describe("pollPolicy", () => {
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
