import type { CSSProperties } from "react";
import { TEAM_IDENTITY_OVERRIDES } from "../data/teamIdentityOverrides";
import type { Team } from "../types";
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
};

const DEFAULT_PRIMARY = "#6B7280";
const DEFAULT_SECONDARY = "#9CA3AF";

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
  const crestUrl = team.logo ?? "";

  return {
    teamId: team.id,
    abbreviation: abbrev,
    name: team.name,
    primary,
    secondary,
    onPrimary: pickOnPrimary(primary),
    crestUrl,
    gradient
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
  return {
    "--team-primary": identity.primary,
    "--team-secondary": identity.secondary,
    "--team-on-primary": identity.onPrimary,
    "--team-gradient-start": identity.gradient[0],
    "--team-gradient-end": identity.gradient[1]
  };
}

export function matchThemeToStyle(
  home: TeamIdentity | null,
  away: TeamIdentity | null
): CSSProperties {
  const homePrimary = home?.primary ?? DEFAULT_PRIMARY;
  const awayPrimary = away?.primary ?? DEFAULT_SECONDARY;

  return {
    background: `linear-gradient(135deg, ${homePrimary}33 0%, var(--surface) 45%, var(--surface) 55%, ${awayPrimary}33 100%)`,
    borderTop: "2px solid transparent",
    borderImage: `linear-gradient(90deg, ${homePrimary}, ${awayPrimary}) 1`
  } as CSSProperties;
}
