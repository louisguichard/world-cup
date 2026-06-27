/** Official FWC 2026 color sequences for goal animation layers */

export const FWC_PALETTE = {
  deep: ["#6B1A1A", "#5B0EA6", "#0D1B4B", "#003D2E"],
  pure: ["#E00000", "#9B59B6", "#1E3EEF", "#00D26A"],
  vivid: ["#FF4500", "#B784D4", "#1AACFF", "#C8FF00"],
  bright: ["#FFA07A", "#FF1493", "#40FFD4", "#EEFF00"],
  metal: { gold: "#D4AF37", silver: "#C0C0C0", bronze: "#CD7F32" },
} as const;

/** All 16 palette colors as a flat array for stripe rotation */
export const FWC_STRIPE_COLORS: readonly string[] = [
  ...FWC_PALETTE.deep,
  ...FWC_PALETTE.pure,
  ...FWC_PALETTE.vivid,
  ...FWC_PALETTE.bright,
];

/**
 * Returns a CSS conic-gradient string for the Amplify burst.
 * 16 equal wedges (22.5deg each), one per palette color, in brand order.
 */
export function buildAmplifyGradient(): string {
  const degPer = 360 / FWC_STRIPE_COLORS.length;
  const stops = FWC_STRIPE_COLORS.map(
    (color, i) => `${color} ${i * degPer}deg ${(i + 1) * degPer}deg`
  );
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

/**
 * Returns 3 border colors for a given act (1=impact, 2=burst, 3=glow).
 */
export function getBorderSequence(act: 1 | 2 | 3): [string, string, string] {
  if (act === 1) {
    return [FWC_PALETTE.deep[0], FWC_PALETTE.pure[0], FWC_PALETTE.vivid[0]];
  }
  if (act === 2) {
    return [FWC_PALETTE.pure[0], FWC_PALETTE.vivid[0], FWC_PALETTE.bright[0]];
  }
  return [FWC_PALETTE.metal.gold, FWC_PALETTE.pure[0], FWC_PALETTE.metal.gold];
}
