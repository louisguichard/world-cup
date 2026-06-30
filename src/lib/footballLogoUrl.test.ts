import { describe, expect, it } from "vitest";
import {
  teamLogoSrcSetForFlagSize,
  teamLogoUrl,
  teamLogoUrlForFlagSize,
  tournamentLogoForTheme,
  tournamentLogoUrl,
} from "./footballLogoUrl";

describe("footballLogoUrl", () => {
  it("builds team logo paths from abbrev", () => {
    expect(teamLogoUrl("BRA", 256)).toBe("/logos/teams/256x256/brazil.png");
    expect(teamLogoUrl("NED", 64)).toBe("/logos/teams/64x64/dutch.png");
    expect(teamLogoUrl("POR", 128)).toBe("/logos/teams/128x128/portuguese-football-federation.png");
  });

  it("maps flag sizes to retina srcSet", () => {
    expect(teamLogoUrlForFlagSize("GER", "sm")).toBe("/logos/teams/64x64/germany.png");
    expect(teamLogoSrcSetForFlagSize("GER", "sm")).toBe(
      "/logos/teams/64x64/germany.png 1x, /logos/teams/128x128/germany.png 2x",
    );
  });

  it("selects tournament logo variant by theme", () => {
    expect(tournamentLogoForTheme("light", 128)).toBe("/logos/tournament/official/128.png");
    expect(tournamentLogoForTheme("dark", 128)).toBe("/logos/tournament/white/128.png");
    expect(tournamentLogoUrl("unofficial", 256)).toBe("/logos/tournament/unofficial/256.png");
  });
});
