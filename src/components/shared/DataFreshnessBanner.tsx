import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../store";
import {
  listDeadProxies,
  subscribeProxyHealth,
  type ProxyHealthState,
} from "../../lib/proxyHealthMonitor";

const STALE_MS = 120_000;
const STALE_TICK_MS = 30_000;

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function DataFreshnessBanner() {
  const lastPollAt = useStore((s) => s.lastPollAt);
  const [deadProxies, setDeadProxies] = useState<ProxyHealthState[]>(() => listDeadProxies());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setDeadProxies(listDeadProxies());
    return subscribeProxyHealth(() => setDeadProxies(listDeadProxies()));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), STALE_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const isStale = lastPollAt != null && now - lastPollAt > STALE_MS;
  const hasDeadProxy = deadProxies.length > 0;

  const staleLabel = useMemo(() => {
    if (!isStale || lastPollAt == null) return null;
    return `Data may be stale — last live update ${formatTime(lastPollAt)}`;
  }, [isStale, lastPollAt]);

  if (!hasDeadProxy && !isStale) return null;

  return (
    <div
      className={`data-freshness-banner${hasDeadProxy ? " data-freshness-banner--proxy-dead" : ""}${isStale ? " data-freshness-banner--stale" : ""}`}
      role="status"
      aria-live="polite"
    >
      {hasDeadProxy
        ? deadProxies.map((proxy) => (
            <span key={proxy.id} className="data-freshness-banner__item">
              <strong>[PROXY DEAD]</strong> {proxy.label}
              {proxy.reason ? ` — ${proxy.reason}` : ""}
            </span>
          ))
        : null}
      {staleLabel ? (
        <span className="data-freshness-banner__item data-freshness-banner__item--stale">
          {staleLabel}
        </span>
      ) : null}
    </div>
  );
}
