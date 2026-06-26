/**
 * Single source of truth for product branding and release metadata.
 * Version numbers are injected at build time from /version.json via Vite `define`.
 */

export const APP_BRAND = {
  /** Full product name — use in page titles, manifest, OG tags */
  name: "Road to the World Cup Final 2026",
  /** Short nav / compact headers */
  shortName: "Road to the Final",
  /** Two-letter mark in top bar */
  mark: "WC",
  /** Splash headline line 1 */
  splashLine1: "ROAD TO THE",
  /** Splash headline line 2 */
  splashLine2: "WORLD CUP FINAL 2026",
  /** Top bar subtitle */
  topBarSubtitle: "WORLD CUP 2026",
  /** Tournament legal name for context bars */
  tournament: "FIFA World Cup 2026™",
  /** One-line product description */
  tagline:
    "Live scores, qualification tracking, venue hubs, and Monte Carlo tournament intelligence for the 48-team FIFA World Cup 2026™.",
  /** npm / internal package identifier (not shown in UI) */
  packageName: "road-to-wc-final",
  /** PWA short name */
  pwaShortName: "WC 2026"
} as const;

export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD = __APP_BUILD__;
export const APP_CHANNEL = __APP_CHANNEL__;

export function formatVersionLabel(options?: { includeBuild?: boolean; prefix?: string }): string {
  const prefix = options?.prefix ?? "v";
  const base = `${prefix}${APP_VERSION}`;
  if (options?.includeBuild === false) return base;
  return `${base} · build ${APP_BUILD}`;
}

export function formatVersionCompact(): string {
  return `v${APP_VERSION}+${APP_BUILD}`;
}
