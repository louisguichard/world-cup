/**
 * ServerPushProvider — Connects the React app to the SSE push stream.
 *
 * Mounted once at the app root. Listens for backend push events and
 * emits a custom DOM event ("wc:push") that existing orchestrators and hooks
 * can listen to for incremental refreshes.
 *
 * Falls back gracefully: if /api/events is not reachable (local dev without
 * the backend), events simply never arrive and the existing polling continues
 * uninterrupted.
 */

import { useCallback } from "react";
import { useServerPush } from "../../hooks/useServerPush";
import type { ServerPushEvent } from "../../hooks/useServerPush";

interface Props {
  children: React.ReactNode;
  /** Disable SSE connection (e.g., during test runs). Default: true */
  enabled?: boolean;
}

/** Custom DOM event dispatched when a server push event arrives. */
export const WC_PUSH_EVENT = "wc:push" as const;

export type WcPushDetail = ServerPushEvent;

declare global {
  interface DocumentEventMap {
    [WC_PUSH_EVENT]: CustomEvent<WcPushDetail>;
  }
}

export function ServerPushProvider({ children, enabled = true }: Props) {
  const handleEvent = useCallback((event: ServerPushEvent) => {
    if (event.type === "heartbeat" || event.type === "connected") return;

    // Broadcast to any listener in the app via CustomEvent
    document.dispatchEvent(
      new CustomEvent<WcPushDetail>(WC_PUSH_EVENT, {
        detail: event,
        bubbles: false,
      })
    );
  }, []);

  useServerPush({
    enabled,
    onEvent: handleEvent,
    onError: (e) => {
      if (import.meta.env.DEV) {
        console.debug("[ServerPushProvider] SSE error (backend may not be running):", e);
      }
    },
  });

  return <>{children}</>;
}
