import { useEffect, useMemo, useRef, useState } from "react";
import type { RankingSnapshot } from "../lib/buildRankingTimeline";
import { useQualificationContext } from "../store/selectors/qualificationSelectors";
import {
  bubbleStateLabel,
  detectCutoffCrossings,
  getThirdPlaceBubbleState,
  type CutoffCrossing,
  type ThirdPlaceBubbleState,
} from "../lib/thirdPlaceLiveStatus";
import { useRankingTimeline } from "./useRankingTimeline";
import type { GroupStanding, TeamRecord } from "../types";
import { useStore } from "../store";

export type FocusTeamRow = {
  teamId: string;
  rank: number;
  record: TeamRecord;
  bubbleState: ThirdPlaceBubbleState;
  bubbleLabel: string;
  positionDelta: number;
  isThirdPlace: boolean;
};

export type UseBestThirdLiveGraphStateInput = {
  focusTeamIds: string[];
};

export type UseBestThirdLiveGraphStateResult = {
  snapshot: RankingSnapshot | null;
  ranked: TeamRecord[];
  deltas: RankingSnapshot["deltas"];
  focusRows: FocusTeamRow[];
  cutoffCrossings: CutoffCrossing[];
  lastEventLabel: string;
  hasData: boolean;
  snapshots: RankingSnapshot[];
  presentIndex: number;
};

function isThirdInGroup(teamId: string, standings: GroupStanding[]): boolean {
  return standings.some((g) => g.rows[2]?.teamId === teamId);
}

function positionDeltaForTeam(
  teamId: string,
  deltas: RankingSnapshot["deltas"]
): number {
  const delta = deltas.find((d) => d.teamId === teamId);
  if (!delta) return 0;
  return delta.positionBefore - delta.positionAfter;
}

export function useBestThirdLiveGraphState({
  focusTeamIds,
}: UseBestThirdLiveGraphStateInput): UseBestThirdLiveGraphStateResult {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const qualContext = useQualificationContext();

  const { snapshots, presentIndex, hasData: timelineHasData } = useRankingTimeline();

  const snapshot = snapshots[presentIndex] ?? null;
  const ranked = snapshot?.rankings ?? [];
  const deltas = snapshot?.deltas ?? [];

  const prevRankedRef = useRef<TeamRecord[]>([]);
  const [cutoffCrossings, setCutoffCrossings] = useState<CutoffCrossing[]>([]);

  useEffect(() => {
    if (ranked.length === 0) return;
    const prev = prevRankedRef.current;
    if (prev.length > 0) {
      const crossings = detectCutoffCrossings(prev, ranked);
      if (crossings.length > 0) {
        setCutoffCrossings(crossings);
        const timer = setTimeout(() => setCutoffCrossings([]), 3000);
        prevRankedRef.current = ranked;
        return () => clearTimeout(timer);
      }
    }
    prevRankedRef.current = ranked;
  }, [ranked]);

  const focusRows = useMemo((): FocusTeamRow[] => {
    return focusTeamIds
      .filter((teamId) => isThirdInGroup(teamId, standings))
      .map((teamId) => {
        const index = ranked.findIndex((r) => r.teamId === teamId);
        const record = ranked[index];
        if (!record || index < 0) {
          return null;
        }
        const rank = index + 1;
        const bubbleState = getThirdPlaceBubbleState(
          teamId,
          rank,
          ranked,
          standings,
          qualContext
        );
        return {
          teamId,
          rank,
          record,
          bubbleState,
          bubbleLabel: bubbleStateLabel(bubbleState),
          positionDelta: positionDeltaForTeam(teamId, deltas),
          isThirdPlace: true,
        };
      })
      .filter((row): row is FocusTeamRow => row !== null);
  }, [focusTeamIds, ranked, standings, qualContext, deltas]);

  const lastEventLabel = snapshot?.label ?? "Live — current standings";

  const hasData = timelineHasData || ranked.length > 0;

  return {
    snapshot,
    ranked,
    deltas,
    focusRows,
    cutoffCrossings,
    lastEventLabel,
    hasData,
    snapshots,
    presentIndex,
  };
}
