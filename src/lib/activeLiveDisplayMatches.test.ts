import { describe, expect, it } from "vitest";
import { buildMaterializedMatchIndex, resolveDisplayMatch } from "./resolveDisplayMatch";
import { isMergedMatchInActivePhase } from "./matchLifecycle";
import type { MergedMatch } from "../types";

function activeLiveDisplayMatches(
  liveMatchesMap: Record<string, MergedMatch>,
  index: ReturnType<typeof buildMaterializedMatchIndex>
): MergedMatch[] {
  return Object.values(liveMatchesMap)
    .map((m) => resolveDisplayMatch(m, index))
    .filter((m) => isMergedMatchInActivePhase(m));
}

describe("active live display pipeline", () => {
  it("surfaces live knockout when ESPN kickoff drifts but schedule kickoff is correct", () => {
    const officialKickoff = Date.parse("2026-06-30T17:00:00.000Z");
    const now = officialKickoff + 25 * 60 * 1000;
    const raw: MergedMatch = {
      id: "espn-77",
      espnEventId: "espn-77",
      matchId: "M77",
      date: "2026-06-30T22:00:00.000Z",
      status: "live",
      homeTeamId: "civ",
      awayTeamId: "col",
      homeScore: 1,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
      clockMinute: 25,
    };
    const materialized: MergedMatch = {
      ...raw,
      id: "M77",
      date: new Date(officialKickoff).toISOString(),
      kickoffMs: officialKickoff,
    };
    const index = buildMaterializedMatchIndex([materialized]);
    const map = { "espn-77": raw };

    expect(isMergedMatchInActivePhase(raw, now)).toBe(false);
    const live = activeLiveDisplayMatches(map, index);
    expect(live).toHaveLength(1);
    expect(live[0]?.matchId).toBe("M77");
    expect(isMergedMatchInActivePhase(live[0]!, now)).toBe(true);
  });

  it("surfaces in-play match when locked flag was set incorrectly", () => {
    const kickoff = Date.parse("2026-06-30T17:00:00.000Z");
    const now = kickoff + 20 * 60 * 1000;
    const raw: MergedMatch = {
      id: "M77",
      matchId: "M77",
      date: new Date(kickoff).toISOString(),
      kickoffMs: kickoff,
      status: "live",
      homeTeamId: "civ",
      awayTeamId: "col",
      homeScore: 0,
      awayScore: 0,
      homeConduct: 0,
      awayConduct: 0,
      locked: true,
      source: "espn",
      clockMinute: 20,
    };
    const index = buildMaterializedMatchIndex([raw]);
    const live = activeLiveDisplayMatches({ M77: raw }, index);
    expect(live).toHaveLength(1);
    expect(isMergedMatchInActivePhase(live[0]!, now)).toBe(true);
  });
});
