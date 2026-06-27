/** Official FWC 2026 color sequences for goal animation layers — sourced from design-tokens. */

import {
  FWC_PALETTE,
  GOAL_ANIMATION_STRIPE_COLORS,
} from "./design-tokens";

export { FWC_PALETTE, GOAL_ANIMATION_STRIPE_COLORS as FWC_STRIPE_COLORS };

/**
 * Returns a CSS conic-gradient string for the Amplify burst.
 * 16 equal wedges (22.5deg each), one per palette color, in brand order.
 */
export function buildAmplifyGradient(): string {
  const degPer = 360 / GOAL_ANIMATION_STRIPE_COLORS.length;
  const stops = GOAL_ANIMATION_STRIPE_COLORS.map(
    (color, i) => `${color} ${i * degPer}deg ${(i + 1) * degPer}deg`
  );
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

/**
 * Returns 3 border colors for a given act (1=impact, 2=burst, 3=glow).
 */
export function getBorderSequence(act: 1 | 2 | 3): [string, string, string] {
  if (act === 1) {
    return [FWC_PALETTE.burgundy, FWC_PALETTE.hotPink, FWC_PALETTE.orangeRed];
  }
  if (act === 2) {
    return [FWC_PALETTE.limeGreen, FWC_PALETTE.hotPink, FWC_PALETTE.aqua];
  }
  return [FWC_PALETTE.gold, FWC_PALETTE.limeGreen, FWC_PALETTE.gold];
}
