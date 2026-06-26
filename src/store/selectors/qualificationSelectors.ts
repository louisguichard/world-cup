import { useMemo } from "react";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { useStore } from "../index";
import type { QualificationStatus, QualificationTier } from "../../types";

export function useQualificationContext() {
  const liveMatches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  return useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
}

export function useTeamQualificationStatus(teamId: string): QualificationStatus {
  const standings = useStore((s) => s.groupStandings);
  const context = useQualificationContext();
  return useMemo(
    () => computeQualificationStatus(teamId, standings, context),
    [teamId, standings, context]
  );
}

export function useTeamQualificationTier(teamId: string): QualificationTier {
  return useTeamQualificationStatus(teamId).status;
}
