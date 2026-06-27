import { describe, expect, it } from "vitest";
import { TEAM_LOGO_OVERRIDES } from "./teamLogoOverrides";
import {
  buildWc2026TeamCatalog,
  mergeTeamsWithCatalog,
  resolveCatalogTeamIdByName,
  resolveCanonicalTeamId,
  resolveTeamAbbrevFromHint,
  resolveTeamLogoFromHint,
} from "./wc2026TeamCatalog";

describe("wc2026TeamCatalog", () => {
  it("includes all 48 nations with logos", () => {
    const catalog = buildWc2026TeamCatalog();
    expect(Object.keys(catalog)).toHaveLength(48);
    expect(catalog.mex.logo).toBe(TEAM_LOGO_OVERRIDES.MEX);
    expect(catalog.mex.abbreviation).toBe("MEX");
  });

  it("resolves Mexico from country name and id hints", () => {
    expect(resolveTeamAbbrevFromHint("Mexico")).toBe("MEX");
    expect(resolveTeamAbbrevFromHint("mex")).toBe("MEX");
    expect(resolveCatalogTeamIdByName("Mexico")).toBe("mex");
    expect(resolveTeamLogoFromHint("Mexico")).toBe(TEAM_LOGO_OVERRIDES.MEX);
  });

  it("mergeTeamsWithCatalog collapses ESPN ids onto 48 catalog keys", () => {
    const merged = mergeTeamsWithCatalog({
      "229": {
        id: "229",
        name: "Brazil",
        shortName: "Brazil",
        abbreviation: "BRA",
        group: "C",
        rating: 1500
      },
      "445": {
        id: "445",
        name: "France",
        shortName: "France",
        abbreviation: "FRA",
        group: "I",
        rating: 1500
      }
    });
    expect(Object.keys(merged)).toHaveLength(48);
    expect(merged.bra?.name).toBe("Brazil");
    expect(merged.bra?.id).toBe("bra");
    expect(merged.fra?.name).toBe("France");
    expect(merged["229"]).toBeUndefined();
  });

  it("resolveCanonicalTeamId maps ESPN numeric ids via team metadata", () => {
    expect(resolveCanonicalTeamId("229", { abbreviation: "BRA", name: "Brazil", shortName: "Brazil" })).toBe(
      "bra"
    );
    expect(resolveCanonicalTeamId("bra")).toBe("bra");
  });
});
