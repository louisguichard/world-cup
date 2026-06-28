/**
 * SSEProvider — dispatches push events to Zustand official/prediction slices.
 * Official and scenario state remain separated per UX blueprint.
 */

import { useCallback, useEffect, useState } from "react";
import { useServerPush } from "../../hooks/useServerPush";
import type { ServerPushEvent } from "../../hooks/useServerPush";
import { setSseConnectionState } from "../../config/liveDataFlags";
import { useStore } from "../../store";
import { LiveIndicator } from "../analyst/LiveIndicator";

interface Props {
  children: React.ReactNode;
  enabled?: boolean;
}

export function SSEProvider({ children, enabled = true }: Props) {
  const applyQualificationChange = useStore((s) => s.applyQualificationChange);
  const markEntityUpdated = useStore((s) => s.markEntityUpdated);
  const applyPredictionUpdate = useStore((s) => s.applyPredictionUpdate);
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  const handleEvent = useCallback(
    (event: ServerPushEvent) => {
      if (event.type === "connected") {
        setConnected(true);
        return;
      }
      if (event.type === "heartbeat") return;

      setLastEventAt(Date.now());

      switch (event.type) {
        case "QualificationChangedEvent": {
          const p = event.payload;
          applyQualificationChange({
            teamId: p.teamId,
            groupId: p.groupId as import("../../types").GroupLetter,
            tier: p.newTier,
            certainty: p.newCertainty,
            lifeState: "ALIVE",
            reasons: [],
            engineVersion: "sse",
            updatedAt: Date.now(),
          });
          break;
        }
        case "EntityUpdatedEvent": {
          markEntityUpdated(event.payload.entityId);
          break;
        }
        case "PredictionUpdatedEvent": {
          const p = event.payload;
          if (p.teamId) {
            applyPredictionUpdate({
              teamId: p.teamId,
              stage: "ROUND_OF_32",
              probability: p.newP,
              modelVersion: "sse",
              updatedAt: Date.now(),
            });
          } else if (p.matchId) {
            applyPredictionUpdate({
              matchId: p.matchId,
              homeWinP: p.newP,
              drawP: 0,
              awayWinP: 1 - p.newP,
              modelVersion: "sse",
              updatedAt: Date.now(),
            });
          }
          break;
        }
        default:
          break;
      }
    },
    [applyQualificationChange, applyPredictionUpdate, markEntityUpdated]
  );

  useServerPush({
    enabled,
    onEvent: handleEvent,
    onConnect: () => {
      setConnected(true);
      setSseConnectionState(true);
    },
    onError: () => {
      setConnected(false);
      setSseConnectionState(false);
    },
  });

  useEffect(() => {
    setSseConnectionState(connected);
  }, [connected]);

  return (
    <>
      <LiveIndicator connected={connected} lastEventAt={lastEventAt} />
      {children}
    </>
  );
}

/** Listen for base-changed without mutating scenario slice directly */
export function useScenarioBaseChangedBanner(): boolean {
  const baseChangedAt = useStore((s) => s.baseChangedAt);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  return Boolean(activeScenarioId && baseChangedAt);
}

export function ScenarioBaseChangedBanner() {
  const show = useScenarioBaseChangedBanner();
  const clearBaseChanged = useStore((s) => s.clearBaseChanged);
  if (!show) return null;
  return (
    <div className="scenario-base-changed-banner" role="status">
      Official state changed — rebasing scenario recommended.
      <button type="button" className="btn-ghost btn-sm" onClick={clearBaseChanged}>
        Dismiss
      </button>
    </div>
  );
}
