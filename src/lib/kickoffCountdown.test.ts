import { describe, expect, it } from "vitest";
import { formatKickoffCountdown, getKickoffCountdownParts } from "./kickoffCountdown";

describe("kickoffCountdown", () => {
  it("formats sub-day countdown as HH:MM:SS", () => {
    const now = Date.parse("2026-06-15T12:00:00Z");
    expect(formatKickoffCountdown("2026-06-15T14:32:18Z", now)).toBe("02:32:18");
  });

  it("formats multi-day countdown with day prefix", () => {
    const now = Date.parse("2026-06-15T12:00:00Z");
    expect(formatKickoffCountdown("2026-06-17T16:32:18Z", now)).toBe("2d 04:32:18");
  });

  it("marks expired kickoffs", () => {
    const now = Date.parse("2026-06-15T14:00:00Z");
    const parts = getKickoffCountdownParts("2026-06-15T12:00:00Z", now);
    expect(parts.expired).toBe(true);
    expect(formatKickoffCountdown("2026-06-15T12:00:00Z", now)).toBe("Starting soon");
  });
});
