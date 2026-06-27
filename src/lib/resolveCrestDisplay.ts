import { TEAM_CREST_DISPLAY, type CrestProfile, type TeamCrestDisplay } from "../data/teamCrestDisplay";
import { hexRelativeLuminance, normalizeHex } from "../utils/colorContrast";

function isWhiteish(hex: string): boolean {
  return hexRelativeLuminance(hex) > 0.82;
}

function isLight(hex: string): boolean {
  return hexRelativeLuminance(hex) > 0.55;
}

function pickDarkest(...colors: string[]): string {
  const valid = colors.map(normalizeHex).filter((c): c is string => Boolean(c));
  if (valid.length === 0) return "#1A1A1A";
  return valid.reduce((darkest, current) =>
    hexRelativeLuminance(current) < hexRelativeLuminance(darkest) ? current : darkest
  );
}

function pickMostSaturatedBrand(
  primary: string,
  secondary: string,
  gradient: [string, string]
): [string, string] {
  const candidates = [primary, secondary, gradient[0], gradient[1]].map(normalizeHex).filter(Boolean) as string[];
  const nonWhite = candidates.filter((c) => !isWhiteish(c));
  const pool = nonWhite.length > 0 ? nonWhite : candidates;
  const start = pickDarkest(...pool);
  const end = pool.find((c) => c !== start && !isWhiteish(c)) ?? start;
  return [start, end];
}

function inferProfile(primary: string, secondary: string): CrestProfile {
  if (isWhiteish(primary) || (isLight(primary) && isWhiteish(secondary))) return "white-crest";
  if (isLight(primary)) return "light-crest";
  if (hexRelativeLuminance(primary) < 0.12) return "dark-crest";
  return "balanced";
}

const PROFILE_INSET: Record<CrestProfile, string> = {
  "white-crest": "16%",
  "light-crest": "14%",
  "dark-crest": "12%",
  balanced: "13%",
};

/** Resolves crest pad + frame colors for a team abbreviation. */
export function resolveCrestDisplay(
  abbreviation: string,
  primary: string,
  secondary: string,
  gradient: [string, string]
): TeamCrestDisplay & { abbreviation: string } {
  const key = abbreviation.toUpperCase();
  const manual = TEAM_CREST_DISPLAY[key];
  if (manual) {
    return {
      ...manual,
      inset: manual.inset ?? PROFILE_INSET[manual.profile],
      abbreviation: key,
    };
  }

  const profile = inferProfile(primary, secondary);
  const pad = pickMostSaturatedBrand(primary, secondary, gradient);
  const frame = gradient.some(isWhiteish) ? pickMostSaturatedBrand(primary, secondary, gradient) : gradient;

  return { profile, pad, frame, inset: PROFILE_INSET[profile], abbreviation: key };
}

export function crestDisplayToCssVars(display: TeamCrestDisplay): Record<string, string> {
  const frame = display.frame ?? display.pad;
  const inset = display.inset ?? PROFILE_INSET[display.profile];
  return {
    "--team-crest-pad-start": display.pad[0],
    "--team-crest-pad-end": display.pad[1],
    "--team-crest-frame-start": frame[0],
    "--team-crest-frame-end": frame[1],
    "--team-crest-inset": inset,
  };
}
