import { useMemo } from "react";
import type { CSSProperties } from "react";
import { matchThemeToStyle, resolveTeamIdentityFromAbbrev, type MatchThemeVariant } from "../lib/teamIdentity";
import { useTeamIdentity } from "./useTeamTheme";

function useMatchIdentity(teamId: string) {
  const identity = useTeamIdentity(teamId);
  return useMemo(
    () => identity ?? resolveTeamIdentityFromAbbrev(teamId),
    [identity, teamId]
  );
}

export function useMatchTheme(
  homeTeamId: string,
  awayTeamId: string,
  variant: MatchThemeVariant = "live"
): CSSProperties {
  const home = useMatchIdentity(homeTeamId);
  const away = useMatchIdentity(awayTeamId);

  return useMemo(() => matchThemeToStyle(home, away, variant), [home, away, variant]);
}
