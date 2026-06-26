import { describe, expect, it } from "vitest";
import type { MergedMatch } from "../../types";
import {
  buildVenueMatchSlice,
  filterMatchesByStadium,
  getMostRecentAtVenue,
  getNextUpcomingAtVenue,
  getTimelinePreview
} from "./venueMatches";

function makeMatch(
  id: string,
  date: string,
  status: MergedMatch["status"],
  venue = "SoFi Stadium, Inglewood"
): MergedMatch {
  return {
    id,
    matchId: id,
    date,
    homeTeamId: "usa",
    awayTeamId: "mex",
    status,
    homeConduct: 0,
    awayConduct: 0,
    locked: status === "completed",
    source: "espn",
    venue
  };
}

describe("venueMatches", () => {
  const now = Date.parse("2026-06-20T12:00:00Z");
  const matches = [
    makeMatch("TEST1", "2026-06-15T12:00:00Z", "completed"),
    makeMatch("TEST2", "2026-06-18T12:00:00Z", "completed"),
    makeMatch("TEST3", "2026-06-25T12:00:00Z", "scheduled"),
    makeMatch("TEST4", "2026-06-28T12:00:00Z", "scheduled")
  ];

  it("filters matches by stadium name", () => {
    const other = makeMatch("TEST99", "2026-06-20T12:00:00Z", "scheduled", "NRG Stadium, Houston");
    const filtered = filterMatchesByStadium([...matches, other], "SoFi Stadium");
    expect(filtered).toHaveLength(4);
  });

  it("returns most recent completed match", () => {
    const recent = getMostRecentAtVenue(matches, "SoFi Stadium", now);
    expect(recent?.matchId).toBe("TEST2");
  });

  it("returns next upcoming match", () => {
    const upcoming = getNextUpcomingAtVenue(matches, "SoFi Stadium", now);
    expect(upcoming?.matchId).toBe("TEST3");
  });

  it("builds timeline window around upcoming pivot", () => {
    const timeline = getTimelinePreview(matches, "SoFi Stadium", 4, now);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.length).toBeLessThanOrEqual(4);
  });

  it("returns empty slice for unknown venue", () => {
    const slice = buildVenueMatchSlice(matches, "Unknown Stadium", now);
    expect(slice.recent).toBeNull();
    expect(slice.upcoming).toBeNull();
    expect(slice.timeline).toHaveLength(0);
  });
});
