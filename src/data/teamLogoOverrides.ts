import { FOOTBALL_LOGO_SLUGS } from "./footballLogoSlugs";

/**
 * Authoritative team crests for all 48 WC 2026 nations (football-logos.cc collection).
 * Used when upstream APIs return kit assets, broken URLs, or nothing at all.
 * Keys are ESPN/FIFA abbreviations.
 *
 * Sync assets: pnpm logos:sync
 */
function teamLogoPath(abbrev: string): string {
  const slug = FOOTBALL_LOGO_SLUGS[abbrev];
  if (!slug) throw new Error(`Missing football logo slug for ${abbrev}`);
  return `/logos/teams/256x256/${slug}.png`;
}

export const TEAM_LOGO_OVERRIDES: Record<string, string> = Object.fromEntries(
  Object.keys(FOOTBALL_LOGO_SLUGS).map((abbrev) => [abbrev, teamLogoPath(abbrev)]),
);

/** All 48 WC 2026 abbreviations covered by overrides. */
export const TEAM_LOGO_ABBREVIATIONS = Object.keys(TEAM_LOGO_OVERRIDES);
