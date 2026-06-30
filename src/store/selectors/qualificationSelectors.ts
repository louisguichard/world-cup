import { useMemo } from "react";
import { uniqueCanonicalTeamIds, resolveTeamForDisplay, resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import {
  buildQualificationSnapshot,
  buildTeamQualificationView,
  type LiveQualificationLayout,
  type TeamQualificationView
} from "../../lib/qualificationView";
import { computeQualificationStatus } from "../../lib/qualification";
import type { QualificationBuckets } from "../../lib/qualification";
import { getQualificationContext } from "../../lib/qualificationContextCache";
import { buildScheduleOverlayFingerprint } from "./scheduleSelectors";
import { useStore } from "../index";
import type { QualificationStatus, QualificationTier } from "../../types";

export function useQualificationContext() {
  const inputFingerprint = useStore((s) =>
    buildScheduleOverlayFingerprint(s.liveMatches, s.groupStandings)
  );
  return useMemo(() => getQualificationContext(), [inputFingerprint]);
}

export type QualificationSnapshot = {
  teamIds: string[];
  buckets: QualificationBuckets;
  views: Map<string, TeamQualificationView>;
  layout: LiveQualificationLayout;
};

export function useQualificationSnapshot(): QualificationSnapshot {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const inputFingerprint = useStore((s) =>
    buildScheduleOverlayFingerprint(s.liveMatches, s.groupStandings)
  );

  return useMemo(() => {
    const { liveMatches } = useStore.getState();
    const matches = Object.values(liveMatches);
    const { teamIds, buckets, views, layout } = buildQualificationSnapshot(teams, standings, matches);
    return { teamIds, buckets, views, layout };
  }, [teams, standings, inputFingerprint]);
}

export function useTeamQualificationView(teamId: string): TeamQualificationView | null {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const context = useQualificationContext();

  return useMemo(() => {
    if (!teamId) return null;
    const team = resolveTeamFromStore(teams, teamId) ?? resolveTeamForDisplay(teamId);
    if (!team) return null;
    return buildTeamQualificationView(teamId, standings, context);
  }, [teamId, teams, standings, context]);
}

export function useTeamQualificationStatus(teamId: string): QualificationStatus {
  const view = useTeamQualificationView(teamId);
  const standings = useStore((s) => s.groupStandings);
  const context = useQualificationContext();
  return useMemo(
    () => view?.status ?? computeQualificationStatus(teamId, standings, context),
    [view, teamId, standings, context]
  );
}

export function useTeamQualificationTier(teamId: string): QualificationTier {
  return useTeamQualificationStatus(teamId).status;
}

export function useCanonicalTeamIds(): string[] {
  const teams = useStore((s) => s.teams);
  return useMemo(() => uniqueCanonicalTeamIds(teams), [teams]);
}
