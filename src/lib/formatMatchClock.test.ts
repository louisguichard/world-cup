import { describe, expect, it } from "vitest";
import { APP_COPY } from "./appCopy";
import { formatLiveClock, formatPeriodLabel } from "./formatMatchClock";

describe("formatLiveClock", () => {
  it("returns Final for completed matches", () => {
    expect(formatLiveClock({ status: "completed" })).toBe(APP_COPY.match.final);
    expect(formatLiveClock({ status: "live", period: "full_time" })).toBe(APP_COPY.match.final);
  });

  it("normalizes ESPN displayClock with stoppage", () => {
    expect(
      formatLiveClock({
        status: "live",
        displayClock: "45'+2",
        period: "first_half"
      })
    ).toBe("45+2'");
  });

  it("normalizes plain displayClock minute", () => {
    expect(
      formatLiveClock({
        status: "live",
        displayClock: "73'",
        period: "second_half"
      })
    ).toBe("73'");
  });

  it("constructs from clockMinute and clockExtra", () => {
    expect(
      formatLiveClock({
        status: "live",
        clockMinute: 90,
        clockExtra: 3,
        period: "second_half"
      })
    ).toBe("90+3'");
  });

  it("constructs from clockMinute only", () => {
    expect(
      formatLiveClock({
        status: "live",
        clockMinute: 67,
        period: "second_half"
      })
    ).toBe("67'");
  });

  it("returns 0' for live match with no clock data", () => {
    expect(formatLiveClock({ status: "live" })).toBe("0'");
  });

  it("returns empty string for scheduled match with no clock data", () => {
    expect(formatLiveClock({ status: "scheduled" })).toBe("");
  });
});

describe("formatPeriodLabel", () => {
  it("maps period values to human labels", () => {
    expect(formatPeriodLabel("first_half", "live")).toBe(APP_COPY.match.firstHalf);
    expect(formatPeriodLabel("second_half", "live")).toBe(APP_COPY.match.secondHalf);
    expect(formatPeriodLabel("half_time", "live")).toBe(APP_COPY.match.halftime);
    expect(formatPeriodLabel("extra_time_first", "live")).toBe(APP_COPY.match.extraTimeFirst);
    expect(formatPeriodLabel("extra_time_second", "live")).toBe(APP_COPY.match.extraTimeSecond);
    expect(formatPeriodLabel("penalties", "live")).toBe(APP_COPY.match.penalties);
  });

  it("returns Game over for completed", () => {
    expect(formatPeriodLabel("full_time", "completed")).toBe(APP_COPY.match.fullTime);
    expect(formatPeriodLabel(undefined, "completed")).toBe(APP_COPY.match.fullTime);
  });

  it("infers extra time from stale second_half period and clock minute", () => {
    expect(formatPeriodLabel("second_half", "live", 106)).toBe(APP_COPY.match.extraTimeSecond);
    expect(formatPeriodLabel("second_half", "live", 95)).toBe(APP_COPY.match.extraTimeFirst);
  });
});
