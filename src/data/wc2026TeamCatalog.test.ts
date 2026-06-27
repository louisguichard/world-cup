import { describe, expect, it } from "vitest";
import { TEAM_LOGO_OVERRIDES } from "./teamLogoOverrides";
import {
  buildWc2026TeamCatalog,
  resolveCatalogTeamIdByName,
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
});
