import { describe, expect, it } from "vitest";
import { resolveCatalogTeamIdByName, resolveTeamAbbrevFromHint } from "./teamNameMap";

describe("teamNameMap", () => {
  it("does not map Australia to USA via substring", () => {
    expect(resolveTeamAbbrevFromHint("Australia")).toBe("AUS");
    expect(resolveCatalogTeamIdByName("Australia")).toBe("aus");
  });

  it("resolves United States exactly", () => {
    expect(resolveTeamAbbrevFromHint("United States")).toBe("USA");
    expect(resolveCatalogTeamIdByName("United States")).toBe("usa");
  });
});
