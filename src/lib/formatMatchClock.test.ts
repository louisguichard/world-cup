import { describe, expect, it } from "vitest";
import { formatLiveClock, formatPeriodLabel } from "./formatMatchClock";

describe("formatLiveClock", () => {
  it("returns FT for completed matches", () => {
    expect(formatLiveClock({ status: "completed" })).toBe("FT");
    expect(formatLiveClock({ status: "live", period: "full_time" })).toBe("FT");
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
});

describe("formatPeriodLabel", () => {
  it("maps period values to human labels", () => {
    expect(formatPeriodLabel("first_half", "live")).toBe("1st Half");
    expect(formatPeriodLabel("second_half", "live")).toBe("2nd Half");
    expect(formatPeriodLabel("half_time", "live")).toBe("Half Time");
    expect(formatPeriodLabel("extra_time_first", "live")).toBe("ET 1st");
    expect(formatPeriodLabel("extra_time_second", "live")).toBe("ET 2nd");
    expect(formatPeriodLabel("penalties", "live")).toBe("Penalties");
  });

  it("returns Full Time for completed", () => {
    expect(formatPeriodLabel("full_time", "completed")).toBe("Full Time");
    expect(formatPeriodLabel(undefined, "completed")).toBe("Full Time");
  });
});
