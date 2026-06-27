import { describe, expect, it } from "vitest";
import {
  matchThemeToStyle,
  resolveTeamIdentity,
  resolveTeamIdentityFromAbbrev,
  teamDisplayName,
  teamLiveCardName,
  teamIdentityToCssVars
} from "./teamIdentity";
import { pickOnPrimary } from "../utils/colorContrast";
import type { Team } from "../types";

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "bra",
    name: "Brazil",
    shortName: "Brazil",
    abbreviation: "BRA",
    group: "D",
    rating: 1800,
    ...overrides
  };
}

describe("teamDisplayName", () => {
  it("prefers full name over short name", () => {
    expect(teamDisplayName(makeTeam({ name: "South Africa", shortName: "RSA" }))).toBe("South Africa");
  });

  it("falls back to short name then human-readable fallback", () => {
    expect(teamDisplayName(makeTeam({ name: "", shortName: "RSA" }), "x")).toBe("RSA");
    expect(teamDisplayName(undefined, "fallback")).toBe("fallback");
    expect(teamDisplayName(undefined, "bra")).toBe("Brazil");
    expect(teamDisplayName(undefined, "BRA")).toBe("Brazil");
    expect(teamDisplayName(undefined, "760415")).toBe("TBD");
  });

  it("prefers schedule name hint over backend id", () => {
    expect(teamDisplayName(undefined, "", "2nd Group A")).toBe("2nd Group A");
  });
});

describe("teamLiveCardName", () => {
  it("uses ESPN short display when it differs from full name", () => {
    expect(
      teamLiveCardName(
        makeTeam({
          name: "Bosnia and Herzegovina",
          shortName: "Bosnia-Herz",
          abbreviation: "BIH",
        })
      )
    ).toBe("Bosnia-Herz");
    expect(
      teamLiveCardName(makeTeam({ name: "United States", shortName: "USA", abbreviation: "USA" }))
    ).toBe("USA");
  });

  it("keeps full name when already short enough", () => {
    expect(teamLiveCardName(makeTeam({ name: "Brazil", shortName: "Brazil", abbreviation: "BRA" }))).toBe(
      "Brazil"
    );
  });

  it("falls back to abbreviation for long names without a distinct short name", () => {
    expect(
      teamLiveCardName(
        makeTeam({
          name: "Bosnia and Herzegovina",
          shortName: "BIH",
          abbreviation: "BIH",
        })
      )
    ).toBe("Bosnia-Herz");
  });

  it("uses curated USA label instead of full country name", () => {
    expect(
      teamLiveCardName(makeTeam({ name: "United States", shortName: "USA", abbreviation: "USA" }))
    ).toBe("USA");
  });
});

describe("resolveTeamIdentity", () => {
  it("prefers manual override over ESPN colors", () => {
    const team = makeTeam({ color: "#fee000", alternateColor: "#193375" });
    const identity = resolveTeamIdentity(team);
    expect(identity?.primary).toBe("#009C3B");
    expect(identity?.secondary).toBe("#FFDF00");
  });

  it("falls back to ESPN colors when no override exists", () => {
    const team = makeTeam({
      id: "xyz",
      abbreviation: "XYZ",
      color: "#112233",
      alternateColor: "#445566"
    });
    const identity = resolveTeamIdentity(team);
    expect(identity?.primary).toBe("#112233");
    expect(identity?.secondary).toBe("#445566");
  });

  it("uses gray defaults when team has no colors", () => {
    const team = makeTeam({ id: "xyz", abbreviation: "XYZ" });
    const identity = resolveTeamIdentity(team);
    expect(identity?.primary).toBe("#6B7280");
    expect(identity?.secondary).toBe("#9CA3AF");
  });

  it("returns null for undefined team", () => {
    expect(resolveTeamIdentity(undefined)).toBeNull();
  });
});

describe("resolveTeamIdentityFromAbbrev", () => {
  it("builds identity from override map", () => {
    const identity = resolveTeamIdentityFromAbbrev("usa");
    expect(identity?.primary).toBe("#002868");
    expect(identity?.abbreviation).toBe("USA");
  });

  it("returns null for unknown abbreviation", () => {
    expect(resolveTeamIdentityFromAbbrev("ZZZ")).toBeNull();
  });
});

describe("teamIdentityToCssVars", () => {
  it("maps identity fields to CSS custom properties", () => {
    const identity = resolveTeamIdentity(makeTeam())!;
    const vars = teamIdentityToCssVars(identity);
    expect(vars["--team-primary"]).toBe("#009C3B");
    expect(vars["--team-secondary"]).toBe("#FFDF00");
    expect(vars["--team-on-primary"]).toBeTruthy();
    expect(vars["--team-gradient-start"]).toBe("#009C3B");
    expect(vars["--team-gradient-end"]).toBe("#FFDF00");
    expect(vars["--team-crest-pad-start"]).toBeTruthy();
    expect(vars["--team-crest-pad-end"]).toBeTruthy();
  });
});

describe("matchThemeToStyle", () => {
  it("uses fallback grays when teams are missing", () => {
    const style = matchThemeToStyle(null, null);
    expect(String(style.background)).toContain("#6B7280");
    expect(String(style.background)).toContain("#9CA3AF");
  });

  it("applies stronger wash for live variant and exposes match color vars", () => {
    const home = resolveTeamIdentity(makeTeam())!;
    const away = resolveTeamIdentity(makeTeam({ id: "usa", abbreviation: "USA" }))!;
    const live = matchThemeToStyle(home, away, "live");
    const subtle = matchThemeToStyle(home, away, "default");
    expect(String(live.background)).toContain("44");
    expect(String(subtle.background)).toContain("18");
    expect(live["--match-home-primary"]).toBe(home.primary);
    expect(live["--match-away-primary"]).toBe(away.primary);
  });
});

describe("pickOnPrimary", () => {
  it("returns dark text on light primaries", () => {
    expect(pickOnPrimary("#FFFFFF")).toBe("#000000");
    expect(pickOnPrimary("#FFDF00")).toBe("#000000");
  });

  it("returns light text on dark primaries", () => {
    expect(pickOnPrimary("#002868")).toBe("#FFFFFF");
    expect(pickOnPrimary("#009C3B")).toBe("#FFFFFF");
  });
});
