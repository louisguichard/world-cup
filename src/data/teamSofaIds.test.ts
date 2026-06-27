import { describe, expect, it } from "vitest";
import { TEAM_SOFA_IDS, resolveSofaTeamId } from "./teamSofaIds";

describe("teamSofaIds", () => {
  it("maps all 48 WC teams", () => {
    expect(Object.keys(TEAM_SOFA_IDS)).toHaveLength(48);
  });

  it("resolves Brazil", () => {
    expect(resolveSofaTeamId("bra")).toBe(4748);
    expect(resolveSofaTeamId("BRA")).toBe(4748);
  });
});
