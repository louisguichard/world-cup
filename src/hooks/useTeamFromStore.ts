import { useMemo } from "react";
import { resolveTeamFromStore } from "../data/wc2026TeamCatalog";
import { useStore } from "../store";
import type { Team } from "../types";

/** Canonical team lookup — resolves catalog id, ESPN numeric alias, or name hint. */
export function useTeamFromStore(teamId: string | undefined | null): Team | undefined {
  const teams = useStore((s) => s.teams);
  return useMemo(
    () => (teamId ? resolveTeamFromStore(teams, teamId) : undefined),
    [teams, teamId]
  );
}
