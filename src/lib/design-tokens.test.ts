import { describe, expect, it } from "vitest";
import { FWC_PALETTE, GOAL_ANIMATION_STRIPE_COLORS, THEME_DARK, THEME_LIGHT } from "./design-tokens";

describe("design-tokens", () => {
  it("uses official FWC navy and lime accents", () => {
    expect(FWC_PALETTE.navyBlue).toBe("#1A247D");
    expect(FWC_PALETTE.limeGreen).toBe("#B1EB00");
  });

  it("defines 16 goal animation stripe colors", () => {
    expect(GOAL_ANIMATION_STRIPE_COLORS).toHaveLength(16);
  });

  it("light theme darkens neon lime for legibility", () => {
    expect(THEME_LIGHT.accentNeon).toBe("#5C8A00");
    expect(THEME_DARK.accentNeon).toBe(FWC_PALETTE.limeGreen);
  });
});
