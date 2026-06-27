import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("sports-odds-intelligence-api.p.rapidapi.com")?.host ??
  "sports-odds-intelligence-api.p.rapidapi.com";

let oddsSessionDisabled = false;

export function isOddsDisabled(): boolean {
  return oddsSessionDisabled;
}

export type OddsLine = {
  home: number | null;
  draw: number | null;
  away: number | null;
  bookmaker?: string;
  updatedAt?: string;
};

export type EventOdds = {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  lines: OddsLine[];
  bestHome?: number | null;
  bestDraw?: number | null;
  bestAway?: number | null;
};

type RawOddsResponse = {
  data?: Array<{
    id?: string;
    home_team?: string;
    away_team?: string;
    bookmakers?: Array<{
      name?: string;
      markets?: Array<{
        key?: string;
        outcomes?: Array<{ name?: string; price?: number }>;
        last_update?: string;
      }>;
    }>;
  }>;
};

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  if (import.meta.env.DEV) {
    return "/rapidapi-odds";
  }
  return "/api/odds";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (oddsSessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      oddsSessionDisabled = true;
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      logger.warn("OddsIntelligence blocked for session", "OddsIntelligenceClient", {
        status: res.status,
        bodySnippet,
      });
      return null;
    }

    if (!res.ok) {
      logger.warn("OddsIntelligence non-OK response", "OddsIntelligenceClient", { status: res.status });
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    logger.warn("OddsIntelligence fetch failed", "OddsIntelligenceClient", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function mapRawToEventOdds(raw: RawOddsResponse): EventOdds[] {
  return (raw.data ?? []).map((event) => {
    const lines: OddsLine[] = [];

    for (const bk of event.bookmakers ?? []) {
      const h2h = bk.markets?.find((m) => m.key === "h2h");
      if (!h2h) continue;

      const home = h2h.outcomes?.find((o) => o.name === event.home_team)?.price ?? null;
      const draw = h2h.outcomes?.find((o) => o.name === "Draw")?.price ?? null;
      const away = h2h.outcomes?.find((o) => o.name === event.away_team)?.price ?? null;

      lines.push({ home, draw, away, bookmaker: bk.name, updatedAt: h2h.last_update });
    }

    const homes = lines.map((l) => l.home).filter((v): v is number => v !== null);
    const draws = lines.map((l) => l.draw).filter((v): v is number => v !== null);
    const aways = lines.map((l) => l.away).filter((v): v is number => v !== null);

    return {
      eventId: String(event.id ?? ""),
      homeTeam: event.home_team ?? "",
      awayTeam: event.away_team ?? "",
      lines,
      bestHome: homes.length ? Math.max(...homes) : null,
      bestDraw: draws.length ? Math.max(...draws) : null,
      bestAway: aways.length ? Math.max(...aways) : null,
    };
  });
}

export async function getLiveOdds(): Promise<EventOdds[]> {
  const data = await fetchJson<RawOddsResponse>("/soccer/");
  if (!data) return [];
  return mapRawToEventOdds(data);
}

export async function getBestLines(eventId: string): Promise<EventOdds | null> {
  const data = await fetchJson<RawOddsResponse>(`/odds/?eventId=${eventId}`);
  if (!data) return null;
  const mapped = mapRawToEventOdds(data);
  return mapped[0] ?? null;
}

/** Test-only reset */
export function resetOddsSessionForTests(): void {
  oddsSessionDisabled = false;
}
