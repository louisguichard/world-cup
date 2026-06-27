import { describe, expect, it } from "vitest";
import {
  SLS_FIFA_RANKINGS_LEAGUE_ID,
  sportsLiveScoresEndpoints,
} from "../config/sportsLiveScoresEndpoints";
import { normalizeSportsLiveScoresRankings } from "./normalizeSportsLiveScoresRankings";

describe("sportsLiveScoresEndpoints", () => {
  it("maps RapidAPI playground routes", () => {
    expect(SLS_FIFA_RANKINGS_LEAGUE_ID).toBe("fifa");
    expect(sportsLiveScoresEndpoints.oddsByMatchId(11352563)).toBe("/get_odds/11352563");
    expect(sportsLiveScoresEndpoints.footballLive()).toBe("/football/live");
    expect(sportsLiveScoresEndpoints.footballRankings("fifa")).toBe("/football/rankings/fifa");
    expect(sportsLiveScoresEndpoints.footballMatchLineups(760415)).toBe(
      "/football/match_lineups/760415"
    );
    expect(sportsLiveScoresEndpoints.sportLive("tennis")).toBe("/tennis/live");
  });
});

describe("normalizeSportsLiveScoresRankings", () => {
  it("skips placeholder rows", () => {
    expect(
      normalizeSportsLiveScoresRankings({
        league_id: "fifa",
        rankings: [{ Text: "No Standings for this league. Sorry!" }],
      })
    ).toEqual({});
  });

  it("parses flat team rows", () => {
    expect(
      normalizeSportsLiveScoresRankings({
        league_id: "fifa",
        rankings: [
          { rank: 1, team_name: "Argentina", points: 1855.2 },
          { rank: 2, team_name: "France", points: 1845.4 },
        ],
      })
    ).toEqual({
      argentina: { rank: 1, points: 1855.2 },
      france: { rank: 2, points: 1845.4 },
    });
  });

  it("parses nested team objects", () => {
    expect(
      normalizeSportsLiveScoresRankings({
        rankings: [{ position: 3, team: { name: "Brazil" }, total_points: 1812 }],
      })
    ).toEqual({
      brazil: { rank: 3, points: 1812 },
    });
  });
});
