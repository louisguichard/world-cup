import { describe, expect, it } from "vitest";
import { groupMatchesByDay } from "./groupMatchesByDay";
import type { MergedMatch } from "../types";

let idCounter = 0;
function makeMatch(overrides: Partial<MergedMatch> & { date: string }): MergedMatch {
  const { date, ...rest } = overrides;
  return {
    id: `m${++idCounter}`,
    homeTeamId: "h",
    awayTeamId: "a",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn",
    ...rest,
    date
  };
}

describe("groupMatchesByDay", () => {
  it("returns empty array for empty input", () => {
    expect(groupMatchesByDay([])).toEqual([]);
  });

  it("excludes completed and locked matches by default", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [
      makeMatch({ date: "2026-06-25T18:00:00", status: "completed" }),
      makeMatch({ date: "2026-06-25T20:00:00", locked: true }),
      makeMatch({ date: "2026-06-25T20:00:00", status: "scheduled" })
    ];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matches).toHaveLength(1);
  });

  it("includes completed matches when includeCompleted is true", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [
      makeMatch({ date: "2026-06-25T18:00:00", status: "completed" }),
      makeMatch({ date: "2026-06-25T20:00:00", locked: true }),
      makeMatch({ date: "2026-06-25T20:00:00", status: "scheduled" })
    ];
    const groups = groupMatchesByDay(matches, { now, includeCompleted: true });
    const allMatches = groups.flatMap((g) => g.matches);
    expect(allMatches).toHaveLength(3);
  });

  it("sets isToday=true and isTomorrow=false for today's group", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [makeMatch({ date: "2026-06-25T20:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.isToday).toBe(true);
    expect(groups[0]?.isTomorrow).toBe(false);
    expect(groups[0]?.label).toBe("Today");
  });

  it("sets isTomorrow=true and isToday=false for tomorrow's group", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [makeMatch({ date: "2026-06-26T20:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.isTomorrow).toBe(true);
    expect(groups[0]?.isToday).toBe(false);
    expect(groups[0]?.label).toBe("Tomorrow");
  });

  it("places same-evening match in Today at 11:30 PM", () => {
    const now = new Date(2026, 5, 25, 23, 30, 0);
    const matches = [makeMatch({ date: "2026-06-25T23:45:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.label).toBe("Today");
  });

  it("places early-morning match in Today when within 4-hour window", () => {
    const now = new Date(2026, 5, 25, 23, 30, 0);
    const matches = [makeMatch({ date: "2026-06-26T01:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.label).toBe("Today");
  });

  it("places match 5 hours away crossing midnight in Tomorrow", () => {
    const now = new Date(2026, 5, 25, 20, 0, 0);
    const matches = [makeMatch({ date: "2026-06-26T01:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.label).toBe("Tomorrow");
  });

  it("uses Intl date label for dates beyond tomorrow", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [makeMatch({ date: "2026-06-28T15:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.label).toMatch(/Jun/);
    expect(groups[0]?.label).not.toBe("Today");
    expect(groups[0]?.label).not.toBe("Tomorrow");
    expect(groups[0]?.isToday).toBe(false);
    expect(groups[0]?.isTomorrow).toBe(false);
  });

  it("exposes dateKey as YYYY-MM-DD string", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [makeMatch({ date: "2026-06-25T20:00:00" })];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles knockout match without a .group property", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const match = makeMatch({ date: "2026-06-27T20:00:00" });
    // Knockout: no group property
    const groups = groupMatchesByDay([match], { now });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matches).toHaveLength(1);
  });

  it("sorts groups chronologically and matches within group by kickoff", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [
      makeMatch({ date: "2026-06-26T20:00:00" }),
      makeMatch({ date: "2026-06-26T15:00:00" }),
      makeMatch({ date: "2026-06-25T22:00:00" })
    ];
    const groups = groupMatchesByDay(matches, { now });
    expect(groups[0]?.label).toBe("Today");
    expect(groups[1]?.label).toBe("Tomorrow");
    const tomorrowTimes = groups[1]?.matches.map((m) => m.date) ?? [];
    expect(tomorrowTimes[0]).toContain("15:00");
    expect(tomorrowTimes[1]).toContain("20:00");
  });
});
