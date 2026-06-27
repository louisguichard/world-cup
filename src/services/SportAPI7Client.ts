import type { MergedMatch, Team } from "../types";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import type { SofaEvent } from "./SofaScoreClient";
import { normalizeSportAPI7Match } from "./adapters/normalizeMatch";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("sportapi7.p.rapidapi.com")?.host ?? "sportapi7.p.rapidapi.com";

export const SPORTAPI_WC_CATEGORY_ID = 1468;

let sportApi7SessionDisabled = false;

export function isSportAPI7Disabled(): boolean {
  return sportApi7SessionDisabled;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  if (import.meta.env.DEV) {
    return "/rapidapi-sportapi";
  }
  return "/api/sportapi";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type SportApiEvent = SofaEvent;

async function fetchJson(path: string): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });
}

async function handleBlocked(res: Response, context: string): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403 && res.status !== 429) {
    return false;
  }
  sportApi7SessionDisabled = true;
  const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
  logger.warn(`SportAPI7 blocked for session (${context})`, "SportAPI7Client", {
    status: res.status,
    bodySnippet,
  });
  return true;
}

export function mapSportApiEventToSofaEvent(event: SportApiEvent): SofaEvent {
  return {
    id: event.id,
    startTimestamp: event.startTimestamp,
    homeTeam: { id: event.homeTeam.id, name: event.homeTeam.name },
    awayTeam: { id: event.awayTeam.id, name: event.awayTeam.name },
    status: event.status,
    homeScore: event.homeScore,
    awayScore: event.awayScore,
  };
}

export async function fetchScheduledToday(): Promise<SofaEvent[]> {
  if (sportApi7SessionDisabled) return [];

  const date = todayIsoDate();
  const path = `/api/v1/category/${SPORTAPI_WC_CATEGORY_ID}/scheduled-events/${date}`;

  try {
    const res = await fetchJson(path);
    if (await handleBlocked(res, "scheduled-events")) return [];
    if (!res.ok) throw new Error(`${res.status}`);

    const data = (await res.json()) as { events?: SportApiEvent[] };
    return (data.events ?? []).map(mapSportApiEventToSofaEvent);
  } catch (error) {
    logger.warn("SportAPI7 fetch failed", "SportAPI7Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function fetchIncidents(eventId: number): Promise<unknown[]> {
  if (sportApi7SessionDisabled) return [];

  try {
    const res = await fetchJson(`/api/v1/event/${eventId}/incidents`);
    if (await handleBlocked(res, "incidents")) return [];
    if (!res.ok) throw new Error(`${res.status}`);

    const data = (await res.json()) as { incidents?: unknown[] };
    return data.incidents ?? [];
  } catch {
    return [];
  }
}

/** Alias for fetchScheduledToday. */
export async function fetchScheduledEvents(dateISO: string): Promise<Partial<MergedMatch>[]> {
  if (sportApi7SessionDisabled) return [];

  const path = `/api/v1/category/${SPORTAPI_WC_CATEGORY_ID}/scheduled-events/${dateISO}`;
  try {
    const res = await fetchJson(path);
    if (await handleBlocked(res, "scheduled-events")) return [];
    if (!res.ok) return [];

    const data = (await res.json()) as { events?: SportApiEvent[] };
    return (data.events ?? []).map((e) => normalizeSportAPI7Match(e));
  } catch (error) {
    logger.warn("SportAPI7 scheduled events failed", "SportAPI7Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Fetches live WC category events. */
export async function fetchLiveEvents(): Promise<Partial<MergedMatch>[]> {
  if (sportApi7SessionDisabled) return [];

  const path = `/api/v1/category/${SPORTAPI_WC_CATEGORY_ID}/events/live`;
  try {
    const res = await fetchJson(path);
    if (await handleBlocked(res, "events-live")) return [];
    if (!res.ok) return [];

    const data = (await res.json()) as { events?: SportApiEvent[] };
    return (data.events ?? []).map((e) => normalizeSportAPI7Match(e));
  } catch (error) {
    logger.warn("SportAPI7 live events failed", "SportAPI7Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Test-only reset */
export function resetSportAPI7SessionForTests(): void {
  sportApi7SessionDisabled = false;
}
