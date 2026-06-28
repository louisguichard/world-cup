/**
 * useServerPush — SSE subscription to /api/events.
 * Closes on error (no infinite EventSource retry) and on unmount.
 */

import { useEffect, useRef } from "react";
import { setSseConnectionState } from "../config/liveDataFlags";

export type ServerPushEvent =
  | { type: "EntityUpdatedEvent"; payload: { entityType: string; entityId: string; changedFields: string[] } }
  | { type: "QualificationChangedEvent"; payload: { teamId: string; groupId: string; newTier: string; newCertainty: string } }
  | { type: "PredictionUpdatedEvent"; payload: { matchId?: string; teamId?: string; newP: number; delta: number } }
  | { type: "TeamAdvanced"; payload: { teamId: string; groupId: string; position: number } }
  | { type: "TeamEliminated"; payload: { teamId: string } }
  | { type: "heartbeat"; payload: Record<string, never> }
  | { type: "connected"; payload: Record<string, never> };

export type ServerPushHandler = (event: ServerPushEvent) => void;

const SSE_URL = "/api/events";

export interface UseServerPushOptions {
  enabled?: boolean;
  filter?: string;
  onEvent?: ServerPushHandler;
  onConnect?: () => void;
  onError?: (err: Event) => void;
}

export function useServerPush({
  enabled = true,
  filter,
  onEvent,
  onConnect,
  onError,
}: UseServerPushOptions = {}): {
  isConnected: boolean;
  reconnect: () => void;
} {
  const esRef = useRef<EventSource | null>(null);
  const isConnectedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const filterRef = useRef(filter);
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onErrorRef = useRef(onError);

  enabledRef.current = enabled;
  filterRef.current = filter;
  onEventRef.current = onEvent;
  onConnectRef.current = onConnect;
  onErrorRef.current = onError;

  const close = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    isConnectedRef.current = false;
    setSseConnectionState(false);
  };

  const open = () => {
    if (!enabledRef.current || document.hidden) return;

    close();

    const url = filterRef.current
      ? `${SSE_URL}?filter=${encodeURIComponent(filterRef.current)}`
      : SSE_URL;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      isConnectedRef.current = true;
      setSseConnectionState(true);
      onConnectRef.current?.();
    };

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as ServerPushEvent;
        onEventRef.current?.(parsed);
      } catch {
        // Malformed message — ignore
      }
    };

    es.onerror = (e: Event) => {
      isConnectedRef.current = false;
      setSseConnectionState(false);
      onErrorRef.current?.(e);
      es.close();
      esRef.current = null;
    };
  };

  useEffect(() => {
    if (!enabled) {
      close();
      return;
    }

    open();

    function onVisibilityChange() {
      if (document.hidden) {
        close();
      } else {
        open();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      close();
    };
    // Open once per mount; options read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isConnected: isConnectedRef.current,
    reconnect: open,
  };
}
