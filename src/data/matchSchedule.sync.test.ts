import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type ScheduleFile = {
  meta: { espnSyncedAt?: string; espnEventCount?: number };
  matches: Array<{
    matchNumber: number;
    group?: string;
    espnEventId?: string;
    kickoff: { utc: string };
    homeTeamKnown?: boolean;
    awayTeamKnown?: boolean;
  }>;
};

describe("matchSchedule.json ESPN sync", () => {
  const schedule = JSON.parse(
    readFileSync(new URL("./matchSchedule.json", import.meta.url), "utf8")
  ) as ScheduleFile;

  it("has recent ESPN sync metadata", () => {
    expect(schedule.meta.espnSyncedAt).toBeTruthy();
    expect(schedule.meta.espnEventCount).toBe(104);
  });

  it("links every match to an ESPN event id", () => {
    const missing = schedule.matches.filter((m) => !m.espnEventId);
    expect(missing.map((m) => m.matchNumber)).toEqual([]);
  });

  it("uses valid group letters for group-stage fixtures", () => {
    const bad = schedule.matches.filter(
      (m) => m.group && !/^[A-L]$/.test(m.group) && m.matchNumber <= 72
    );
    expect(bad).toEqual([]);
  });

  it("stores ISO kickoff timestamps", () => {
    const invalid = schedule.matches.filter((m) => Number.isNaN(Date.parse(m.kickoff.utc)));
    expect(invalid.map((m) => m.matchNumber)).toEqual([]);
  });
});
