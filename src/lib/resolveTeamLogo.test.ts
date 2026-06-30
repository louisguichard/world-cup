import { describe, expect, it } from "vitest";
import { TEAM_LOGO_ABBREVIATIONS, TEAM_LOGO_OVERRIDES } from "../data/teamLogoOverrides";
import { applyTeamLogoOverrides, isInvalidTeamLogoUrl, resolveTeamLogo, resolveTeamLogoFromHint } from "./resolveTeamLogo";

describe("isInvalidTeamLogoUrl", () => {
  it("rejects Wikipedia kit shorts assets", () => {
    expect(
      isInvalidTeamLogoUrl(
        "https://upload.wikimedia.org/wikipedia/commons/a/a7/Kit_shorts_cod2526h.png"
      )
    ).toBe(true);
  });

  it("accepts federation crest URLs", () => {
    expect(
      isInvalidTeamLogoUrl(
        "https://upload.wikimedia.org/wikipedia/en/6/62/Congolese_Association_Football_Federation_logo.png"
      )
    ).toBe(false);
  });
});

describe("resolveTeamLogo", () => {
  it("uses override for Congo DR (COD)", () => {
    expect(
      resolveTeamLogo({
        abbreviation: "COD",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Kit_shorts_cod2526h.png",
      })
    ).toBe(TEAM_LOGO_OVERRIDES.COD);
  });

  it("prefers override over API logo when both exist", () => {
    expect(
      resolveTeamLogo({
        abbreviation: "BRA",
        logo: "https://example.com/brazil.svg",
      })
    ).toBe(TEAM_LOGO_OVERRIDES.BRA);
  });

  it("drops invalid kit logos without an override", () => {
    expect(
      resolveTeamLogo({
        abbreviation: "XYZ",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Kit_shorts_xyz2526h.png",
      })
    ).toBeUndefined();
  });

  it("covers all 48 WC 2026 nations", () => {
    expect(TEAM_LOGO_ABBREVIATIONS.length).toBe(48);
    expect(TEAM_LOGO_OVERRIDES.BIH).toBe("/logos/teams/256x256/bosnia-and-herzegovina.png");
    expect(TEAM_LOGO_OVERRIDES.QAT).toBe("/logos/teams/256x256/qatar.png");
    expect(TEAM_LOGO_OVERRIDES.KOR).toBe("/logos/teams/256x256/south-korea.png");
    expect(TEAM_LOGO_OVERRIDES.SEN).toBe("/logos/teams/256x256/senegal.png");
  });

  it("uses override even when API logo is missing", () => {
    expect(resolveTeamLogo({ abbreviation: "BIH", logo: "" })).toBe(TEAM_LOGO_OVERRIDES.BIH);
    expect(resolveTeamLogo({ abbreviation: "QAT", logo: undefined })).toBe(TEAM_LOGO_OVERRIDES.QAT);
  });

  it("resolves Mexico by name, id, and abbrev", () => {
    expect(resolveTeamLogo({ abbreviation: "MEX", logo: "", name: "Mexico", shortName: "MEX", id: "mex" })).toBe(
      TEAM_LOGO_OVERRIDES.MEX
    );
    expect(resolveTeamLogoFromHint("Mexico")).toBe(TEAM_LOGO_OVERRIDES.MEX);
    expect(resolveTeamLogoFromHint("mex")).toBe(TEAM_LOGO_OVERRIDES.MEX);
  });

  it("rejects kit assets even for known teams without override key in abbrev field", () => {
    expect(
      resolveTeamLogo({
        abbreviation: "XYZ",
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Kit_shorts_mex2526h.png",
        name: "Mexico",
        shortName: "Mexico",
        id: "Mexico",
      })
    ).toBe(TEAM_LOGO_OVERRIDES.MEX);
  });

  it("never returns upstream API crest URLs when catalog abbrev is known", () => {
    const resolved = resolveTeamLogo({
      abbreviation: "BRA",
      logo: "https://a.espncdn.com/i/teamlogos/countries/500/bra.png",
    });
    expect(resolved).toBe(TEAM_LOGO_OVERRIDES.BRA);
    expect(resolved?.startsWith("/logos/teams/")).toBe(true);
  });
});

describe("applyTeamLogoOverrides", () => {
  it("patches teams map in place semantics", () => {
    const teams = {
      drcongo: {
        id: "drcongo",
        name: "Congo DR",
        shortName: "Congo DR",
        abbreviation: "COD",
        group: "D" as const,
        logo: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Kit_shorts_cod2526h.png",
        rating: 1375,
      },
    };

    const patched = applyTeamLogoOverrides(teams);
    expect(patched.drcongo.logo).toBe(TEAM_LOGO_OVERRIDES.COD);
  });
});
