import { describe, expect, it } from "vitest";
import { resolveTeamIdentity } from "./teamIdentity";
import type { Team } from "../types";

const baseTeam: Team = {
  id: "espn-1",
  name: "Brazil",
  shortName: "BRA",
  abbreviation: "BRA",
  group: "A",
  rating: 1500,
  color: "aabbcc",
  alternateColor: "112233",
  logo: "https://example.com/bra.png"
};

describe("resolveTeamIdentity", () => {
  it("prefers static FIFA override over ESPN colors", () => {
    const identity = resolveTeamIdentity(baseTeam);
    expect(identity?.primary).toBe("#009C3B");
    expect(identity?.secondary).toBe("#FFDF00");
    expect(identity?.gradient).toEqual(["#009C3B", "#FFDF00"]);
  });

  it("falls back to normalized ESPN hex when no override", () => {
    const team: Team = {
      ...baseTeam,
      abbreviation: "ZZZ",
      shortName: "ZZZ",
      color: "ff0000",
      alternateColor: "0000ff"
    };
    const identity = resolveTeamIdentity(team);
    expect(identity?.primary).toBe("#ff0000");
    expect(identity?.secondary).toBe("#0000ff");
  });

  it("uses primaryOverride when provided", () => {
    const identity = resolveTeamIdentity(baseTeam, "#123456");
    expect(identity?.primary).toBe("#123456");
  });

  it("returns null for undefined team", () => {
    expect(resolveTeamIdentity(undefined)).toBeNull();
  });
});
