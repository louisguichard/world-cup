import { describe, expect, it } from "vitest";
import { mergeTeamMetadata } from "./WorldCup2026Client";
import type { Team } from "../types";

describe("mergeTeamMetadata", () => {
  const espnTeams: Record<string, Team> = {
    t1: {
      id: "t1",
      name: "Argentina",
      shortName: "Argentina",
      abbreviation: "arg",
      group: "A",
      rating: 2000,
    },
    t2: {
      id: "t2",
      name: "France",
      shortName: "France",
      abbreviation: "FRA",
      group: "B",
      rating: 1990,
    },
    t3: {
      id: "t3",
      name: "Japan",
      shortName: "Japan",
      abbreviation: "JPN",
      group: "C",
      rating: 1800,
    },
  };

  it("patches logo and color by abbreviation (case-insensitive)", () => {
    const { teams, patched } = mergeTeamMetadata(espnTeams, [
      {
        id: "202",
        name: "Argentina",
        shortName: "Argentina",
        abbreviation: "ARG",
        logo: "https://example.com/arg.png",
        color: "#74acdf",
      },
      {
        id: "203",
        name: "France",
        shortName: "France",
        abbreviation: "fra",
        logo: "https://example.com/fra.png",
        color: "#002395",
      },
    ]);

    expect(patched).toBe(2);
    expect(teams.t1.logo).toBe("https://example.com/arg.png");
    expect(teams.t1.color).toBe("#74acdf");
    expect(teams.t2.logo).toBe("https://example.com/fra.png");
    expect(teams.t2.color).toBe("#002395");
    expect(teams.t3.logo).toBeUndefined();
  });

  it("skips teams with no matching WC entry", () => {
    const { teams, patched } = mergeTeamMetadata(espnTeams, []);
    expect(patched).toBe(0);
    expect(teams).toEqual(espnTeams);
  });
});
