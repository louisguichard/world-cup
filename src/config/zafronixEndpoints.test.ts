import { describe, expect, it } from "vitest";
import { zafronixEndpoints } from "../config/zafronixEndpoints";

describe("zafronixEndpoints", () => {
  it("builds root-relative paths without legacy prefix", () => {
    expect(zafronixEndpoints.health()).toBe("/health");
    expect(zafronixEndpoints.tournament(2026)).toBe("/tournaments/2026");
    expect(zafronixEndpoints.team("Brazil")).toBe("/teams/Brazil");
    expect(zafronixEndpoints.teamRoster("Brazil", 2026)).toBe("/teams/Brazil/roster?year=2026");
    expect(zafronixEndpoints.match("M65")).toBe("/matches/M65");
    expect(zafronixEndpoints.matchHistory("M65")).toBe("/matches/M65/history");
    expect(zafronixEndpoints.matchResult("M65")).toBe("/matches/M65/result");
    expect(zafronixEndpoints.standings(2026)).toBe("/standings?year=2026");
    expect(zafronixEndpoints.search("brazil")).toBe("/search?q=brazil");
    expect(zafronixEndpoints.usage()).toBe("/me/usage");
  });
});
