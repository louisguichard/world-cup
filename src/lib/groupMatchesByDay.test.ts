import { describe, expect, it } from "vitest";
import { groupMatchesByDay } from "./groupMatchesByDay";
import type { MergedMatch } from "../types";

function makeMatch(overrides: Partial<MergedMatch> & { date: string }): MergedMatch {
  const { date, ...rest } = overrides;
  return {
    id: "m1",
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

  it("excludes completed and locked matches", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [
      makeMatch({ id: "done", date: "2026-06-25T18:00:00", status: "completed" }),
      makeMatch({ id: "locked", date: "2026-06-25T20:00:00", locked: true }),
      makeMatch({ id: "up", date: "2026-06-25T20:00:00", status: "scheduled" })
    ];
    const groups = groupMatchesByDay(matches, now);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matches).toHaveLength(1);
    expect(groups[0]?.matches[0]?.id).toBe("up");
  });

  it("places same-evening match in Today at 11:30 PM", () => {
    const now = new Date(2026, 5, 25, 23, 30, 0);
    const matches = [makeMatch({ id: "late", date: "2026-06-25T23:45:00" })];
    const groups = groupMatchesByDay(matches, now);
    expect(groups[0]?.label).toBe("Today");
  });

  it("places early-morning match in Today when within 4-hour window", () => {
    const now = new Date(2026, 5, 25, 23, 30, 0);
    const matches = [makeMatch({ id: "after-midnight", date: "2026-06-26T01:00:00" })];
    const groups = groupMatchesByDay(matches, now);
    expect(groups[0]?.label).toBe("Today");
    expect(groups[0]?.label).not.toBe("Tomorrow");
  });

  it("places match 5 hours away crossing midnight in Tomorrow", () => {
    const now = new Date(2026, 5, 25, 20, 0, 0);
    const matches = [makeMatch({ id: "next-day", date: "2026-06-26T01:00:00" })];
    const groups = groupMatchesByDay(matches, now);
    expect(groups[0]?.label).toBe("Tomorrow");
  });

  it("uses Intl date label for dates beyond tomorrow", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [makeMatch({ id: "later", date: "2026-06-28T15:00:00" })];
    const groups = groupMatchesByDay(matches, now);
    expect(groups[0]?.label).toMatch(/Jun/);
    expect(groups[0]?.label).not.toBe("Today");
    expect(groups[0]?.label).not.toBe("Tomorrow");
  });

  it("sorts groups chronologically and matches within group by kickoff", () => {
    const now = new Date(2026, 5, 25, 12, 0, 0);
    const matches = [
      makeMatch({ id: "t2", date: "2026-06-26T20:00:00" }),
      makeMatch({ id: "t1", date: "2026-06-26T15:00:00" }),
      makeMatch({ id: "today-late", date: "2026-06-25T22:00:00" })
    ];
    const groups = groupMatchesByDay(matches, now);
    expect(groups[0]?.label).toBe("Today");
    expect(groups[1]?.label).toBe("Tomorrow");
    expect(groups[1]?.matches.map((m) => m.id)).toEqual(["t1", "t2"]);
  });
});
