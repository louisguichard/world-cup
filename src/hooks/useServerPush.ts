/**
 * useServerPush — SSE subscription to /api/events.
 * Supplements the existing polling with server-push for real-time updates.
 *
 * On receiving QualificationChangedEvent or PredictionUpdatedEvent, triggers
 * a store refresh for the affected entities rather than replacing store state
 * directly (safe incremental integration — existing orchestrator continues to
 * work as fallback while the backend matures).
 *
 * Connection lifecycle:
 * - Opens EventSource on mount (or when `enabled` becomes true)
 * - Reconnects automatically (browser EventSource API handles this)
 * - Pauses when document is hidden (to avoid idle connections)
 * - Closes cleanly on unmount
 */

import { useEffect, useRef, useCallback } from "react";

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
  /** If false, the SSE connection will not be opened. Default: true */
  enabled?: boolean;
  /** Comma-separated event types to subscribe to. Default: all */
  filter?: string;
  /** Called for each push event received */
  onEvent?: ServerPushHandler;
  /** Called when the connection is opened */
  onConnect?: () => void;
  /** Called when the connection encounters an error */
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
  const onEventRef = useRef(onEvent);
  const onConnectRef = useRef(onConnect);
  const onErrorRef = useRef(onError);

  onEventRef.current = onEvent;
  onConnectRef.current = onConnect;
  onErrorRef.current = onError;

  const close = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const open = useCallback(() => {
    close();

    const url = filter ? `${SSE_URL}?filter=${encodeURIComponent(filter)}` : SSE_URL;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      isConnectedRef.current = true;
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
      onErrorRef.current?.(e);
      // EventSource auto-reconnects on error; no manual retry needed
    };
  }, [close, filter]);

  const reconnect = useCallback(() => {
    if (enabled) open();
  }, [enabled, open]);

  useEffect(() => {
    if (!enabled) {
      close();
      return;
    }

    open();

    // Pause on page hide, resume on show
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
  }, [enabled, open, close]);

  return { isConnected: isConnectedRef.current, reconnect };
}
