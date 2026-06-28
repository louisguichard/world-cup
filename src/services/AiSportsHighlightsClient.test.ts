import { describe, expect, it } from "vitest";
import { aiSportsHighlightsEndpoints } from "../config/aiSportsHighlightsEndpoints";
import { buildAiHighlightRequest } from "./highlights/buildAiHighlightRequest";

describe("aiSportsHighlightsEndpoints", () => {
  it("builds generateHighlights route with noqueue", () => {
    expect(aiSportsHighlightsEndpoints.generateHighlights({ noqueue: true })).toBe(
      "/generateHighlights?noqueue=1"
    );
    expect(aiSportsHighlightsEndpoints.generateHighlights()).toBe("/generateHighlights");
  });
});

describe("buildAiHighlightRequest", () => {
  it("builds football World Cup request from completed match", () => {
    const request = buildAiHighlightRequest({
      match: {
        id: "m1",
        date: "2026-06-27T18:00:00Z",
        homeTeamId: "BRA",
        awayTeamId: "ARG",
        status: "completed",
        homeScore: 2,
        awayScore: 1,
        homeConduct: 0,
        awayConduct: 0,
        locked: true,
        source: "espn",
        stage: "R32",
        group: "A",
      },
      homeTeam: { id: "BRA", name: "Brazil", abbrev: "BRA", group: "A", flag: "🇧🇷", confederation: "CONMEBOL", fifaRank: 1, elo: 2000, form: [], conduct: 0 },
      awayTeam: { id: "ARG", name: "Argentina", abbrev: "ARG", group: "A", flag: "🇦🇷", confederation: "CONMEBOL", fifaRank: 2, elo: 1990, form: [], conduct: 0 },
      events: [
        {
          providerId: "1",
          minute: 23,
          type: "goal",
          teamId: "BRA",
          playerName: "Vinícius Jr",
        },
      ],
    });

    expect(request.competition).toContain("World Cup");
    expect(request.teamA).toBe("Brazil");
    expect(request.teamB).toBe("Argentina");
    expect(request.score).toBe("2-1");
    expect(request.keyMoments).toContain("Vinícius Jr");
    expect(request.language).toBe("en");
  });
});
