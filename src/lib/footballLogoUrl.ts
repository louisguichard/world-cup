import { footballLogoSlugForAbbrev } from "../data/footballLogoSlugs";

export type LogoSize = 64 | 128 | 256 | 512;

export type TournamentLogoVariant = "official" | "white" | "unofficial";

export type TeamFlagLogoSize = "sm" | "lg" | "xl";

const TEAM_FLAG_SIZE_MAP: Record<TeamFlagLogoSize, LogoSize> = {
  sm: 64,
  lg: 128,
  xl: 256,
};

const TEAM_FLAG_RETINA_MAP: Record<TeamFlagLogoSize, LogoSize> = {
  sm: 128,
  lg: 256,
  xl: 512,
};

export function teamLogoUrl(abbrev: string, size: LogoSize): string {
  const slug = footballLogoSlugForAbbrev(abbrev);
  if (!slug) {
    throw new Error(`Unknown team abbrev for logo: ${abbrev}`);
  }
  return `/logos/teams/${size}x${size}/${slug}.png`;
}

export function teamLogoUrlForFlagSize(abbrev: string, flagSize: TeamFlagLogoSize): string {
  return teamLogoUrl(abbrev, TEAM_FLAG_SIZE_MAP[flagSize]);
}

export function teamLogoSrcSetForFlagSize(abbrev: string, flagSize: TeamFlagLogoSize): string {
  const base = TEAM_FLAG_SIZE_MAP[flagSize];
  const retina = TEAM_FLAG_RETINA_MAP[flagSize];
  return `${teamLogoUrl(abbrev, base)} 1x, ${teamLogoUrl(abbrev, retina)} 2x`;
}

export function tournamentLogoUrl(variant: TournamentLogoVariant, size: LogoSize | 700): string {
  return `/logos/tournament/${variant}/${size}.png`;
}

export function tournamentLogoForTheme(
  theme: "light" | "dark",
  size: LogoSize | 700,
  variant: "mark" | "full" = "mark",
): string {
  const logoVariant = theme === "dark" ? "white" : "official";
  const resolvedSize =
    variant === "full" && size < 512 ? (512 as LogoSize | 700) : size;
  return tournamentLogoUrl(logoVariant, resolvedSize);
}
