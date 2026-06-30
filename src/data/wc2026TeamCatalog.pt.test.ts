import { describe, expect, it } from "vitest";
import {
  buildCatalogTeam,
  resolveTeamAbbrevFromHint,
  WC2026_TEAM_NAMES_ES,
} from "./wc2026TeamCatalog";
import { teamDisplayNameEs } from "../lib/teamIdentity";

describe("Portuguese team name resolution", () => {
  it("resolves andrekamp feed names to FIFA abbrevs", () => {
    expect(resolveTeamAbbrevFromHint("México")).toBe("MEX");
    expect(resolveTeamAbbrevFromHint("África do Sul")).toBe("RSA");
    expect(resolveTeamAbbrevFromHint("EUA")).toBe("USA");
    expect(resolveTeamAbbrevFromHint("Tchéquia")).toBe("CZE");
    expect(resolveTeamAbbrevFromHint("Coreia do Sul")).toBe("KOR");
    expect(resolveTeamAbbrevFromHint("Bósnia")).toBe("BIH");
  });

  it("exposes Spanish canonical names on catalog teams", () => {
    const mex = buildCatalogTeam("MEX");
    expect(mex.nameEs).toBe("México");
    expect(teamDisplayNameEs(mex)).toBe("México");
    expect(WC2026_TEAM_NAMES_ES.USA).toBe("Estados Unidos");
  });
});
