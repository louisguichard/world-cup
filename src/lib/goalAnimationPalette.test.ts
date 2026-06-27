import { describe, expect, it } from "vitest";
import {
  buildAmplifyGradient,
  FWC_STRIPE_COLORS,
  getBorderSequence,
} from "./goalAnimationPalette";

describe("goalAnimationPalette", () => {
  it("builds a 16-stop conic gradient", () => {
    const gradient = buildAmplifyGradient();
    expect(gradient.startsWith("conic-gradient(from 0deg,")).toBe(true);
    for (const color of FWC_STRIPE_COLORS) {
      expect(gradient).toContain(color);
    }
  });

  it("returns border sequences per act", () => {
    expect(getBorderSequence(1)).toHaveLength(3);
    expect(getBorderSequence(2)).toHaveLength(3);
    expect(getBorderSequence(3)[0]).toBe("#D4AF37");
  });
});
