import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { CSSProperties } from "react";
import {
  resolveTeamIdentity,
  resolveTeamIdentityFromAbbrev,
  teamIdentityToCssVars,
  type TeamIdentity,
} from "../lib/teamIdentity";
import {
  resolveCanonicalTeamId,
  resolveTeamFromStore,
} from "../data/wc2026TeamCatalog";
import { useStore } from "../store";
import type { Team } from "../types";
import { extractDominantColor } from "../utils/extractTeamColor";

const FALLBACK_VARS: Record<string, string> = {
  "--team-primary": "#6B7280",
  "--team-secondary": "#9CA3AF",
  "--team-on-primary": "#FFFFFF",
  "--team-gradient-start": "#6B7280",
  "--team-gradient-end": "#9CA3AF",
  "--team-crest-pad-start": "#4B5563",
  "--team-crest-pad-end": "#374151",
  "--team-crest-frame-start": "#6B7280",
  "--team-crest-frame-end": "#9CA3AF",
  "--team-crest-inset": "13%",
};

function selectStoreTeam(
  teams: Record<string, Team>,
  teamId: string | undefined | null
): Team | undefined {
  if (!teamId) return undefined;
  const direct = teams[teamId];
  if (direct) return direct;
  return teams[resolveCanonicalTeamId(teamId)];
}

function teamColorSignature(team: Team | undefined, teamId: string | undefined | null): string {
  if (!team) return teamId ?? "";
  return [
    team.id,
    team.logo ?? "",
    team.color ?? "",
    team.alternateColor ?? "",
    team.abbreviation ?? "",
  ].join("|");
}

function clearAsyncPrimary(setAsyncPrimary: Dispatch<SetStateAction<string | undefined>>): void {
  setAsyncPrimary((prev) => (prev === undefined ? prev : undefined));
}

export function useTeamIdentity(teamId: string | undefined | null): TeamIdentity | null {
  const teams = useStore((s) => s.teams);
  const storeTeam = useStore((s) => selectStoreTeam(s.teams, teamId));
  const team = useMemo(
    () => (teamId ? resolveTeamFromStore(teams, teamId) : undefined),
    [teams, teamId, storeTeam]
  );
  const colorSignature = teamColorSignature(storeTeam, teamId);
  const [asyncPrimary, setAsyncPrimary] = useState<string | undefined>();

  const syncIdentity = useMemo(
    () => (team ? resolveTeamIdentity(team, asyncPrimary) : null),
    [team, asyncPrimary]
  );

  useEffect(() => {
    if (!team?.logo) {
      clearAsyncPrimary(setAsyncPrimary);
      return;
    }

    const sync = resolveTeamIdentity(team);
    if (sync && sync.primary !== "#6B7280") {
      clearAsyncPrimary(setAsyncPrimary);
      return;
    }

    let cancelled = false;
    void extractDominantColor(team.logo).then((color) => {
      if (!cancelled && color !== "#6B7280") {
        setAsyncPrimary((prev) => (prev === color ? prev : color));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [teamId, colorSignature, team?.logo]);

  return syncIdentity;
}

function resolveThemeIdentity(
  teamId: string | undefined | null,
  identity: TeamIdentity | null
): TeamIdentity | null {
  if (identity) return identity;
  return teamId ? resolveTeamIdentityFromAbbrev(teamId) : null;
}

export function useTeamThemeBundle(teamId: string | undefined | null): {
  theme: CSSProperties;
  identity: TeamIdentity | null;
} {
  const identity = useTeamIdentity(teamId);
  const resolved = useMemo(
    () => resolveThemeIdentity(teamId, identity),
    [teamId, identity]
  );
  const theme = useMemo(() => {
    if (!resolved) return FALLBACK_VARS as CSSProperties;
    return teamIdentityToCssVars(resolved) as CSSProperties;
  }, [resolved]);

  return { theme, identity: resolved };
}

export function useTeamTheme(teamId: string | undefined | null): CSSProperties {
  return useTeamThemeBundle(teamId).theme;
}
