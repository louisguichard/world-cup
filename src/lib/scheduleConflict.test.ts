import { describe, expect, it } from "vitest";
import { detectKickoffConflict } from "./scheduleConflict";
import type { MergedMatch } from "../types";

describe("scheduleConflict", () => {
  it("detects kickoff drift between schedule and ESPN", () => {
    const match: MergedMatch = {
      id: "1",
      matchId: "M4",
      date: "2026-06-13T01:00Z",
      homeTeamId: "usa",
      awayTeamId: "par",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      group: "C"
    };

    const conflict = detectKickoffConflict(match);
    expect(conflict).not.toBeNull();
    expect(conflict?.scheduleLabel).toBeTruthy();
    expect(conflict?.liveLabel).toBeTruthy();
  });

  it("returns null when kickoffs align", () => {
    const match: MergedMatch = {
      id: "2",
      matchId: "M1",
      date: "2026-06-11T19:00Z",
      homeTeamId: "mex",
      awayTeamId: "rsa",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      group: "A"
    };

    expect(detectKickoffConflict(match)).toBeNull();
  });
});
