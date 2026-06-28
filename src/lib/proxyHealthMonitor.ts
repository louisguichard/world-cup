import { isApiEnabled } from "../config/apiFlags";
import { isFootApi7Disabled } from "../services/FootApi7Client";
import { isSportAPI7Disabled } from "../services/SportAPI7Client";
import { isWeatherDisabled } from "../services/WeatherClient";
import { isWorldCup2026Disabled } from "../services/WorldCup2026Client";

export type ProxyId = "sportapi7" | "footapi7" | "wc2026" | "weather";

export type ProxyHealthState = {
  id: ProxyId;
  label: string;
  alive: boolean;
  reason?: string;
};

const PROXY_LABELS: Record<ProxyId, string> = {
  sportapi7: "SportAPI7",
  footapi7: "FootAPI7",
  wc2026: "WC 2026 Teams",
  weather: "Open Weather",
};

const PROXY_API_FLAG: Record<ProxyId, "sportApi7" | "footApi7" | "wc2026Teams" | "openWeather"> = {
  sportapi7: "sportApi7",
  footapi7: "footApi7",
  wc2026: "wc2026Teams",
  weather: "openWeather",
};

type Listener = () => void;
const listeners = new Set<Listener>();

const deadReasons = new Map<ProxyId, string>();
const runtimeDead = new Set<ProxyId>();

function isRuntimeDisabled(id: ProxyId): boolean {
  switch (id) {
    case "sportapi7":
      return isSportAPI7Disabled();
    case "footapi7":
      return isFootApi7Disabled();
    case "wc2026":
      return isWorldCup2026Disabled();
    case "weather":
      return isWeatherDisabled();
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Mark a RapidAPI proxy as unreachable (401/403/429 or repeated fetch failures). */
export function markProxyDead(id: ProxyId, reason = "Proxy unreachable"): void {
  if (!runtimeDead.has(id)) {
    runtimeDead.add(id);
    deadReasons.set(id, reason);
    notify();
  }
}

/** Clear runtime dead state (tests / manual recovery). */
export function resetProxyHealthForTests(): void {
  runtimeDead.clear();
  deadReasons.clear();
  notify();
}

export function subscribeProxyHealth(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listProxyHealth(): ProxyHealthState[] {
  const ids: ProxyId[] = ["sportapi7", "footapi7", "wc2026", "weather"];

  return ids
    .filter((id) => isApiEnabled(PROXY_API_FLAG[id]))
    .map((id) => {
      const sessionDead = isRuntimeDisabled(id);
      const markedDead = runtimeDead.has(id);
      const alive = !sessionDead && !markedDead;

      return {
        id,
        label: PROXY_LABELS[id],
        alive,
        reason: alive ? undefined : deadReasons.get(id) ?? "Proxy blocked or unreachable",
      };
    });
}

export function listDeadProxies(): ProxyHealthState[] {
  return listProxyHealth().filter((entry) => !entry.alive);
}

export function hasDeadProxies(): boolean {
  return listDeadProxies().length > 0;
}
