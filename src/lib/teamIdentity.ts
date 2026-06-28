import type { CSSProperties } from "react";
import { liveCardNameForAbbrev } from "../data/teamLiveCardNames";
import { TEAM_IDENTITY_OVERRIDES } from "../data/teamIdentityOverrides";
import { resolveCatalogTeamName, resolveTeamLogoByAbbrev, resolveTeamForDisplay } from "../data/wc2026TeamCatalog";
import type { CrestProfile } from "../data/teamCrestDisplay";
import type { Team } from "../types";
import { crestDisplayToCssVars, resolveCrestDisplay } from "./resolveCrestDisplay";
import { resolveTeamLogo } from "./resolveTeamLogo";
import { normalizeHex, pickOnPrimary } from "../utils/colorContrast";

export type TeamIdentity = {
  teamId: string;
  abbreviation: string;
  name: string;
  primary: string;
  secondary: string;
  onPrimary: string;
  crestUrl: string;
  gradient: [string, string];
  crestProfile: CrestProfile;
  crestPad: [string, string];
  crestFrame: [string, string];
};

const DEFAULT_PRIMARY = "#6B7280";
const DEFAULT_SECONDARY = "#9CA3AF";

/** True when a string is a backend id (ESPN numeric or catalog abbrev), not user-facing text. */
export function isInternalTeamId(value: string | undefined | null): boolean {
  const v = value?.trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[a-z]{3}$/i.test(v) && resolveTeamForDisplay(v)) return true;
  return false;
}

export function resolveTeamIdentity(team: Team | undefined, primaryOverride?: string): TeamIdentity | null {
  if (!team) return null;

  const abbrev = team.abbreviation?.toUpperCase() ?? team.shortName?.toUpperCase() ?? team.id;
  const staticOverride = TEAM_IDENTITY_OVERRIDES[abbrev];

  const espnPrimary = normalizeHex(team.color);
  const espnSecondary = normalizeHex(team.alternateColor);

  const primary =
    primaryOverride ??
    staticOverride?.primary ??
    espnPrimary ??
    DEFAULT_PRIMARY;

  const secondary =
    staticOverride?.secondary ??
    espnSecondary ??
    espnPrimary ??
    DEFAULT_SECONDARY;

  const gradient: [string, string] = staticOverride?.gradient ?? [primary, secondary];
  const crestUrl = resolveTeamLogo(team) ?? "";
  const crest = resolveCrestDisplay(abbrev, primary, secondary, gradient);

  return {
    teamId: team.id,
    abbreviation: abbrev,
    name: team.name,
    primary,
    secondary,
    onPrimary: pickOnPrimary(primary),
    crestUrl,
    gradient,
    crestProfile: crest.profile,
    crestPad: crest.pad,
    crestFrame: crest.frame ?? crest.pad,
  };
}

export function resolveTeamIdentityById(
  teamId: string,
  teams: Record<string, Team>,
  primaryOverride?: string
): TeamIdentity | null {
  return resolveTeamIdentity(teams[teamId], primaryOverride);
}

export function teamIdentityToCssVars(identity: TeamIdentity): Record<string, string> {
  const crestVars = crestDisplayToCssVars({
    profile: identity.crestProfile,
    pad: identity.crestPad,
    frame: identity.crestFrame,
  });

  return {
    "--team-primary": identity.primary,
    "--team-secondary": identity.secondary,
    "--team-on-primary": identity.onPrimary,
    "--team-gradient-start": identity.gradient[0],
    "--team-gradient-end": identity.gradient[1],
    ...crestVars,
  };
}

export type MatchThemeVariant = "live" | "default";

export function resolveTeamIdentityFromAbbrev(abbrev: string): TeamIdentity | null {
  const key = abbrev.toUpperCase();
  const staticOverride = TEAM_IDENTITY_OVERRIDES[key];
  if (!staticOverride) return null;

  const primary = staticOverride.primary;
  const secondary = staticOverride.secondary;
  const gradient: [string, string] = staticOverride.gradient ?? [primary, secondary];
  const crest = resolveCrestDisplay(key, primary, secondary, gradient);

  return {
    teamId: key.toLowerCase(),
    abbreviation: key,
    name: key,
    primary,
    secondary,
    onPrimary: pickOnPrimary(primary),
    crestUrl: resolveTeamLogoByAbbrev(key) ?? "",
    gradient,
    crestProfile: crest.profile,
    crestPad: crest.pad,
    crestFrame: crest.frame ?? crest.pad,
  };
}

/** User-visible team label — always prefer full country name; never show backend ids. */
export function teamDisplayName(
  team?: Pick<Team, "name" | "shortName" | "abbreviation" | "id"> | null,
  fallback = "TBD",
  nameHint?: string
): string {
  const name = team?.name?.trim();
  if (name) return name;

  const short = team?.shortName?.trim();
  if (short) return short;

  const hint = nameHint?.trim();
  if (hint) return hint;

  const catalogTeam = resolveTeamForDisplay(fallback, team as Team | undefined);
  if (catalogTeam?.name) return catalogTeam.name;

  const fromCatalog = resolveCatalogTeamName(fallback);
  if (fromCatalog) return fromCatalog;

  const fb = fallback.trim();
  if (fb && !isInternalTeamId(fb)) return fb;

  return "TBD";
}

/** Compact label for live hero/schedule cards — ESPN short name or FIFA abbrev when shorter. */
export function teamLiveCardName(
  team?: Pick<Team, "name" | "shortName" | "abbreviation" | "id"> | null,
  fallback = "TBD",
  nameHint?: string
): string {
  const name = team?.name?.trim();
  const short = team?.shortName?.trim();
  const abbrev = team?.abbreviation?.trim()?.toUpperCase();

  if (
    short &&
    name &&
    short.length > 3 &&
    !isInternalTeamId(short) &&
    short.localeCompare(name, undefined, { sensitivity: "accent" }) !== 0
  ) {
    return short;
  }

  const curated = liveCardNameForAbbrev(abbrev);
  if (curated) return curated;

  if (name) return name;
  if (short) return short;
  if (abbrev && abbrev.length > 3) return abbrev;

  const hint = nameHint?.trim();
  if (hint) return hint;

  const catalogTeam = resolveTeamForDisplay(fallback, team as Team | undefined);
  if (catalogTeam) {
    const curatedFromCatalog = liveCardNameForAbbrev(catalogTeam.abbreviation);
    if (curatedFromCatalog) return curatedFromCatalog;
    if (catalogTeam.name) return catalogTeam.name;
  }

  const fromCatalog = resolveCatalogTeamName(fallback);
  if (fromCatalog) return fromCatalog;

  const fb = fallback.trim();
  if (fb && !isInternalTeamId(fb)) return fb;

  return "TBD";
}

export function matchThemeToStyle(
  home: TeamIdentity | null,
  away: TeamIdentity | null,
  variant: MatchThemeVariant = "live"
): CSSProperties {
  const homePrimary = home?.primary ?? DEFAULT_PRIMARY;
  const awayPrimary = away?.primary ?? DEFAULT_SECONDARY;
  const homeSecondary = home?.secondary ?? homePrimary;
  const awaySecondary = away?.secondary ?? awayPrimary;
  const wash = variant === "live" ? "44" : "18";

  return {
    "--match-home-primary": homePrimary,
    "--match-home-secondary": homeSecondary,
    "--match-away-primary": awayPrimary,
    "--match-away-secondary": awaySecondary,
    background: `linear-gradient(135deg, ${homePrimary}${wash} 0%, var(--surface) 45%, var(--surface) 55%, ${awayPrimary}${wash} 100%)`,
  } as CSSProperties;
}
