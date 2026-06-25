import { describe, expect, it } from "vitest";
import { parseEspnScoreboard } from "./ESPNClient";
import { simulateTournamentOutcomes } from "../lib/tournament";
import type { Match, Team } from "../types";

const sampleTeams: Team[] = [
  {
    id: "1",
    name: "Mexico",
    shortName: "MEX",
    abbreviation: "MEX",
    group: "A",
    rating: 1500
  },
  {
    id: "2",
    name: "South Africa",
    shortName: "RSA",
    abbreviation: "RSA",
    group: "A",
    rating: 1400
  }
];

const sampleMatches: Match[] = [
  {
    id: "m1",
    group: "A",
    date: "2026-06-11T19:00:00Z",
    homeTeamId: "1",
    awayTeamId: "2",
    status: "scheduled",
    homeConduct: 0,
    awayConduct: 0,
    locked: false,
    source: "espn"
  }
];

describe("SimulationScheduler bootstrap path", () => {
  it("simulates with group-stage matches only", () => {
    const result = simulateTournamentOutcomes(sampleTeams, sampleMatches, [], 20, 2026);
    expect(result.championOdds.length).toBeGreaterThan(0);
  });

  it("parses ESPN knockout without assigning group A fallback", async () => {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300"
    );
    const sb = await res.json();
    const { matches } = parseEspnScoreboard(sb);
    const knockoutWithFakeGroup = matches.filter(
      (m) => m.group === "A" && Date.parse(m.date) > Date.parse("2026-07-01T00:00:00Z")
    );
    expect(knockoutWithFakeGroup).toHaveLength(0);
  }, 15_000);
});
