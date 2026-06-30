import { describe, expect, it } from "vitest";
import { formatKickoff, formatKickoffDate, formatKickoffTime, formatMatchDateCompact } from "./formatKickoff";

describe("formatKickoffDate", () => {
  it("formats a valid UTC ISO string to a weekday date", () => {
    const result = formatKickoffDate("2026-06-25T15:00:00.000Z");
    expect(result).toMatch(/Thu|Wed/);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/25/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatKickoffDate("")).toBe("");
    expect(formatKickoffDate("not-a-date")).toBe("");
  });
});

describe("formatKickoffTime", () => {
  it("formats UTC ISO to 12-hour local time with AM/PM", () => {
    const result = formatKickoffTime("2026-06-25T15:00:00.000Z");
    expect(result).toMatch(/(AM|PM)/);
    expect(result).not.toMatch(/\b1[3-9]:/);
    expect(result).not.toMatch(/\b2[0-3]:/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatKickoffTime("")).toBe("");
    expect(formatKickoffTime("invalid")).toBe("");
  });
});

describe("formatMatchDateCompact", () => {
  it('formats as "Month Day" without weekday or time', () => {
    const result = formatMatchDateCompact("2026-06-11T19:00:00Z");
    expect(result).toMatch(/June/);
    expect(result).toMatch(/11/);
    expect(result).not.toMatch(/·/);
    expect(result).not.toMatch(/(AM|PM)/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatMatchDateCompact("")).toBe("");
    expect(formatMatchDateCompact("invalid")).toBe("");
  });
});

describe("formatKickoff", () => {
  it("includes date and time for upcoming matches", () => {
    const result = formatKickoff("2026-06-25T15:00:00.000Z", false);
    expect(result).toContain("·");
    expect(result).toMatch(/(AM|PM)/);
  });

  it("returns date-only for completed matches", () => {
    const completed = formatKickoff("2026-06-25T15:00:00.000Z", true);
    const dateOnly = formatKickoffDate("2026-06-25T15:00:00.000Z");
    expect(completed).toBe(dateOnly);
    expect(completed).not.toContain("·");
  });

  it("returns empty string for invalid input", () => {
    expect(formatKickoff("")).toBe("");
    expect(formatKickoff("bad-date")).toBe("");
  });
});
