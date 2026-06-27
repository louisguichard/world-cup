import { describe, expect, it } from "vitest";
import { buildWc2026TeamCatalog } from "../data/wc2026TeamCatalog";
import {
  flagTeamIdForMatch,
  teamDisplayNameForMatch,
  teamDisplayNameFromId,
} from "./matchTeamDisplay";
import type { MergedMatch } from "../types";

const catalog = buildWc2026TeamCatalog();

describe("matchTeamDisplay", () => {
  it("resolves catalog name from lowercase id when store team is missing", () => {
    expect(teamDisplayNameFromId("bra", {})).toBe("Brazil");
  });

  it("never shows ESPN numeric ids", () => {
    expect(teamDisplayNameFromId("760415", {})).toBe("TBD");
  });

  it("uses schedule placeholder when team id is empty", () => {
    const match: MergedMatch = {
      id: "M73",
      matchId: "M73",
      date: "2026-07-05T19:00:00Z",
      homeTeamId: "",
      awayTeamId: "",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    const label = teamDisplayNameForMatch(match, "home", catalog);
    expect(label).not.toBe("");
    expect(label).not.toMatch(/^[a-z]{3}$/);
    expect(label.length).toBeGreaterThan(2);
  });

  it("prefers catalog flag id over raw backend id", () => {
    const match: MergedMatch = {
      id: "M1",
      matchId: "M1",
      date: "2026-06-11T19:00:00Z",
      homeTeamId: "mex",
      awayTeamId: "rsa",
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "espn",
    };
    expect(flagTeamIdForMatch(match, "home", catalog)).toBe("mex");
    expect(teamDisplayNameForMatch(match, "home", catalog)).toBe("Mexico");
  });
});
