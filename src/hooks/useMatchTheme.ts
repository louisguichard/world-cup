import { useMemo } from "react";
import type { CSSProperties } from "react";
import { matchThemeToStyle } from "../lib/teamIdentity";
import { useTeamIdentity } from "./useTeamTheme";

export function useMatchTheme(homeTeamId: string, awayTeamId: string): CSSProperties {
  const home = useTeamIdentity(homeTeamId);
  const away = useTeamIdentity(awayTeamId);

  return useMemo(() => matchThemeToStyle(home, away), [home, away]);
}
