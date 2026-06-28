import { describe, expect, it } from "vitest";
import { allSportsApi2Endpoints, resolveAllSportsApi2Route } from "../config/allSportsApi2Endpoints";
import { ALL_SPORTS_API2_ROUTES, listAllSportsApi2Routes } from "./AllSportsApi2Client";

describe("allSportsApi2Endpoints", () => {
  it("builds tennis ATP rankings path from user curl", () => {
    expect(allSportsApi2Endpoints.tennis.rankings("atp")).toBe("/api/tennis/rankings/atp");
  });

  it("builds football live events path", () => {
    expect(allSportsApi2Endpoints.football.eventsLive()).toBe("/api/football/events/live");
  });

  it("resolves templated routes", () => {
    expect(resolveAllSportsApi2Route("/api/{sport}/event/{id}", { sport: "football", id: 123 })).toBe(
      "/api/football/event/123"
    );
  });
});

describe("AllSportsApi2 route catalog", () => {
  it("loads 298 playground routes", () => {
    expect(ALL_SPORTS_API2_ROUTES.length).toBe(298);
    expect(listAllSportsApi2Routes().length).toBe(298);
  });

  it("includes tennis rankings templates", () => {
    const tennis = ALL_SPORTS_API2_ROUTES.filter((r) => r.route.startsWith("/api/tennis/rankings"));
    expect(tennis.length).toBeGreaterThanOrEqual(2);
  });
});
