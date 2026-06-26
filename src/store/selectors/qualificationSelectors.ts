import { useMemo } from "react";
import { computeQualificationStatus } from "../../lib/qualification";
import { useStore } from "../index";
import type { QualificationStatus, QualificationTier } from "../../types";

export function useTeamQualificationStatus(teamId: string): QualificationStatus {
  const standings = useStore((s) => s.groupStandings);
  return useMemo(() => computeQualificationStatus(teamId, standings), [teamId, standings]);
}

export function useTeamQualificationTier(teamId: string): QualificationTier {
  return useTeamQualificationStatus(teamId).status;
}
