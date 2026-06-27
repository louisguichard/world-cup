import { describe, expect, it } from "vitest";
import {
  allSportLiveStreamEndpoints,
  liveStreamV4Endpoints,
  liveStreamV5Endpoints,
} from "../config/allSportLiveStreamEndpoints";
import { findLiveStreamScheduleMatch } from "../services/AllSportLiveStreamClient";

describe("allSportLiveStreamEndpoints", () => {
  it("maps v5/v4 playground names to v6 routes", () => {
    expect(allSportLiveStreamEndpoints.sportIdsV6()).toBe("/api/v6/sport-id");
    expect(liveStreamV5Endpoints.allSportId()).toBe("/api/v6/sport-id");
    expect(liveStreamV4Endpoints.allSportsId()).toBe("/api/v6/sport-id");
    expect(
      allSportLiveStreamEndpoints.scheduleV6({ slug: "football", current_date: "2026-06-27" })
    ).toBe("/api/v6/matches?slug=football&current_date=2026-06-27");
    expect(allSportLiveStreamEndpoints.playStreamV6(99)).toBe("/api/v6/play-stream?id=99");
    expect(liveStreamV4Endpoints.checkStreamAvailability(99)).toBe("/api/v6/play-stream?id=99");
  });
});

describe("findLiveStreamScheduleMatch", () => {
  it("matches by home/away team names", () => {
    const hit = findLiveStreamScheduleMatch(
      [
        { id: "1", title: "Brazil vs Serbia", homeTeam: "Brazil", awayTeam: "Serbia" },
        { id: "2", title: "Other Game", homeTeam: "A", awayTeam: "B" },
      ],
      "Brazil",
      "Serbia"
    );
    expect(hit?.id).toBe("1");
  });
});
