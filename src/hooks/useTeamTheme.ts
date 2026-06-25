import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { resolveTeamIdentity, resolveTeamIdentityById, teamIdentityToCssVars } from "../lib/teamIdentity";
import { useStore } from "../store";
import { extractDominantColor } from "../utils/extractTeamColor";

const FALLBACK_VARS: Record<string, string> = {
  "--team-primary": "#6B7280",
  "--team-secondary": "#9CA3AF",
  "--team-on-primary": "#FFFFFF",
  "--team-gradient-start": "#6B7280",
  "--team-gradient-end": "#9CA3AF"
};

export function useTeamIdentity(teamId: string | undefined | null) {
  const team = useStore((s) => (teamId ? s.teams[teamId] : undefined));
  const [asyncPrimary, setAsyncPrimary] = useState<string | undefined>();

  const syncIdentity = useMemo(
    () => (team ? resolveTeamIdentity(team, asyncPrimary) : null),
    [team, asyncPrimary]
  );

  useEffect(() => {
    if (!team?.logo) {
      setAsyncPrimary(undefined);
      return;
    }
    const sync = resolveTeamIdentity(team);
    if (sync && sync.primary !== "#6B7280") {
      setAsyncPrimary(undefined);
      return;
    }
    let cancelled = false;
    void extractDominantColor(team.logo).then((color) => {
      if (!cancelled && color !== "#6B7280") setAsyncPrimary(color);
    });
    return () => {
      cancelled = true;
    };
  }, [team]);

  return syncIdentity;
}

export function useTeamTheme(teamId: string | undefined | null): CSSProperties {
  const identity = useTeamIdentity(teamId);
  return useMemo(() => {
    if (!identity) return FALLBACK_VARS as CSSProperties;
    return teamIdentityToCssVars(identity) as CSSProperties;
  }, [identity]);
}

export function useTeamThemeByTeam(teamId: string | undefined | null) {
  const teams = useStore((s) => s.teams);
  return useMemo(
    () => resolveTeamIdentityById(teamId ?? "", teams),
    [teamId, teams]
  );
}
