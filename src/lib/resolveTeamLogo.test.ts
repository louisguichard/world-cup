import { describe, expect, it } from "vitest";
import { TEAM_LOGO_ABBREVIATIONS, TEAM_LOGO_OVERRIDES } from "../data/teamLogoOverrides";
import { applyTeamLogoOverrides, isInvalidTeamLogoUrl, resolveTeamLogo } from "./resolveTeamLogo";

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
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/en/6/62/Congolese_Association_Football_Federation_logo.png"
    );
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
    expect(TEAM_LOGO_OVERRIDES.BIH).toContain("Bosnia");
    expect(TEAM_LOGO_OVERRIDES.QAT).toContain("Qatar");
    expect(TEAM_LOGO_OVERRIDES.KOR).toContain("Korea");
    expect(TEAM_LOGO_OVERRIDES.SEN).toContain("Senegal");
  });

  it("uses override even when API logo is missing", () => {
    expect(resolveTeamLogo({ abbreviation: "BIH", logo: "" })).toBe(TEAM_LOGO_OVERRIDES.BIH);
    expect(resolveTeamLogo({ abbreviation: "QAT", logo: undefined })).toBe(TEAM_LOGO_OVERRIDES.QAT);
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
    expect(patched.drcongo.logo).toBe(
      "https://upload.wikimedia.org/wikipedia/en/6/62/Congolese_Association_Football_Federation_logo.png"
    );
  });
});
