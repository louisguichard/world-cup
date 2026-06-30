import { describe, expect, it } from "vitest";
import type { MatchEvent, MergedMatch, Team } from "../types";
import { normalizeEventsForMatch, resolveEventsForMatch } from "./resolveMatchEvents";

const jordan: Team = {
  id: "jor",
  name: "Jordan",
  shortName: "JOR",
  abbreviation: "JOR",
  group: "J",
  rating: 1375,
};

const argentina: Team = {
  id: "arg",
  name: "Argentina",
  shortName: "ARG",
  abbreviation: "ARG",
  group: "J",
  rating: 1375,
};

const espnJordan: Team = {
  id: "227",
  name: "Jordan",
  shortName: "JOR",
  abbreviation: "JOR",
  group: "J",
  rating: 1375,
};

const match: MergedMatch = {
  id: "live-jor-arg",
  espnEventId: "401547123",
  homeTeamId: "jor",
  awayTeamId: "arg",
  date: "2026-06-27T19:00:00Z",
  status: "live",
  homeConduct: 0,
  awayConduct: 0,
  homeScore: 0,
  awayScore: 0,
  source: "espn",
};

const espnGoal: MatchEvent = {
  providerId: "espn-1",
  minute: 12,
  type: "goal",
  teamId: "227",
  playerName: "Olwan",
};

describe("normalizeEventsForMatch", () => {
  it("remaps ESPN team ids to catalog ids", () => {
    const teams = { jor: jordan, arg: argentina, "227": espnJordan };
    const [normalized] = normalizeEventsForMatch([espnGoal], match, teams);
    expect(normalized.teamId).toBe("jor");
  });
});

describe("resolveEventsForMatch", () => {
  it("normalizes when teams are provided", () => {
    const teams = { jor: jordan, arg: argentina, "227": espnJordan };
    const events = resolveEventsForMatch(match, { [match.id]: [espnGoal] }, teams);
    expect(events[0]?.teamId).toBe("jor");
  });

  it("resolves events stored under espnEventId for knockout matches", () => {
    const knockoutMatch: MergedMatch = {
      id: "store-m74",
      matchId: "M74",
      espnEventId: "401999888",
      stage: "R32",
      homeTeamId: "ned",
      awayTeamId: "mar",
      date: "2026-06-29T19:00:00Z",
      status: "live",
      homeConduct: 0,
      awayConduct: 0,
      homeScore: 1,
      awayScore: 0,
      source: "espn",
    };
    const goal: MatchEvent = {
      providerId: "espn-m74-1",
      minute: 23,
      type: "goal",
      teamId: "mar",
      playerName: "Hakimi",
    };
    const events = resolveEventsForMatch(
      knockoutMatch,
      { "401999888": [goal] },
      { mar: { id: "mar", name: "Morocco", shortName: "MAR", abbreviation: "MAR", group: "E", rating: 1500 } }
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.playerName).toBe("Hakimi");
  });
});
