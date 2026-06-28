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
});
