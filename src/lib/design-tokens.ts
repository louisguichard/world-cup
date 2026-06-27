// FIFA World Cup 2026 — Official Color Palette (from brand kit)

export const FWC_PALETTE = {
  // Darks
  burgundy: "#751312",
  navyBlue: "#1A247D",
  darkTeal: "#004C3F",
  black: "#000000",

  // Mids
  deepPurple: "#6101EB",
  royalBlue: "#304FFF",
  green: "#00C752",
  magenta: "#BA69C6",
  hotPink: "#E81F63",
  skyBlue: "#2196F3",
  orangeRed: "#FF3D00",

  // Brights / Accents
  lavender: "#B387FF",
  limeGreen: "#B1EB00",
  aqua: "#63FFD8",
  yellow: "#ECFF43",
  peachCoral: "#FF9E81",

  // Neutrals
  white: "#FFFFFF",

  // Metallics (goal animation act 3)
  gold: "#D4AF37",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
} as const;

export type FwcColor = keyof typeof FWC_PALETTE;

/** Dark mode (default — app is dark-first) */
export const THEME_DARK = {
  surfaceBase: FWC_PALETTE.black,
  surfaceCard: "#0D0D1A",
  surfaceElevated: "#141430",
  borderSubtle: "#1A247D33",

  textPrimary: FWC_PALETTE.white,
  textSecondary: "#B0B8D4",
  textMuted: "#606880",

  primaryBrand: FWC_PALETTE.navyBlue,
  primaryAccent: FWC_PALETTE.royalBlue,
  accentNeon: FWC_PALETTE.limeGreen,
  accentEnergy: FWC_PALETTE.hotPink,
  accentCool: FWC_PALETTE.aqua,

  statusThrough: FWC_PALETTE.green,
  statusContention: FWC_PALETTE.yellow,
  statusAtRisk: FWC_PALETTE.orangeRed,
  statusOut: FWC_PALETTE.burgundy,
} as const;

/** Light mode overrides */
export const THEME_LIGHT = {
  ...THEME_DARK,
  surfaceBase: "#F0F2F8",
  surfaceCard: "#FFFFFF",
  surfaceElevated: "#E8EBFF",
  borderSubtle: "#1A247D22",
  textPrimary: FWC_PALETTE.navyBlue,
  textSecondary: "#2A3060",
  textMuted: "#8890AA",
  accentNeon: "#5C8A00",
} as const;

/** 16-stop stripe rotation for goal animation burst (official palette order) */
export const GOAL_ANIMATION_STRIPE_COLORS: readonly string[] = [
  FWC_PALETTE.burgundy,
  FWC_PALETTE.navyBlue,
  FWC_PALETTE.darkTeal,
  FWC_PALETTE.black,
  FWC_PALETTE.deepPurple,
  FWC_PALETTE.royalBlue,
  FWC_PALETTE.green,
  FWC_PALETTE.magenta,
  FWC_PALETTE.hotPink,
  FWC_PALETTE.skyBlue,
  FWC_PALETTE.orangeRed,
  FWC_PALETTE.lavender,
  FWC_PALETTE.limeGreen,
  FWC_PALETTE.aqua,
  FWC_PALETTE.yellow,
  FWC_PALETTE.peachCoral,
];
