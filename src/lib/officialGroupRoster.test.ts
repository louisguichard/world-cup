import { beforeEach, describe, expect, it } from "vitest";
import { buildOfficialGroupRoster, resetOfficialGroupRosterCache } from "./officialGroupRoster";
import { mergeTeamsWithCatalog, resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import type { Team } from "../types";

describe("buildOfficialGroupRoster", () => {
  beforeEach(() => {
    resetOfficialGroupRosterCache();
  });

  it("assigns four unique teams to each group", () => {
    const roster = buildOfficialGroupRoster();
    for (const group of Object.keys(roster)) {
      expect(roster[group as keyof typeof roster]).toHaveLength(4);
    }
    const all = Object.values(roster).flat();
    expect(new Set(all).size).toBe(48);
  });
});

describe("resolveTeamFromStore", () => {
  it("resolves ESPN numeric aliases to catalog teams", () => {
    const espnMexico: Team = {
      id: "205",
      name: "Mexico",
      shortName: "MEX",
      abbreviation: "MEX",
      group: "A",
      rating: 1500,
    };
    const teams = mergeTeamsWithCatalog({ "205": espnMexico });
    const resolved = resolveTeamFromStore(teams, "205");
    expect(resolved?.name).toBe("Mexico");
    expect(resolved?.id).toBe("mex");
  });
});
