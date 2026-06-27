import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  METEOSOURCE_HOST,
  weatherEndpoints,
} from "../config/weatherEndpoints";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost(METEOSOURCE_HOST)?.host ?? METEOSOURCE_HOST;

let weatherSessionDisabled = false;

export function isWeatherDisabled(): boolean {
  return weatherSessionDisabled;
}

export type WeatherData = {
  city: string;
  tempF: number;
  tempC: number;
  description: string;
  /** Meteosource icon_num as string (1–36). */
  icon: string;
  rainChancePercent: number;
  humidity: number;
  windMph: number;
};

export type MeteosourcePointResponse = {
  units?: string;
  current?: {
    icon?: string;
    icon_num?: number;
    summary?: string;
    weather?: string;
    temperature?: number;
    humidity?: number;
    wind?: { speed?: number; dir?: string };
    precipitation?: { total?: number; type?: string };
  };
  hourly?: {
    data?: Array<{
      probability?: { precipitation?: number };
      precipitation?: { total?: number };
    }>;
  };
};

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  return "/api/weather";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

function fToC(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237);
}

function kphToMph(kph: number): number {
  return Math.round(kph * 0.621371);
}

function normalizeTemperature(temp: number, units?: string): { tempC: number; tempF: number } {
  if (units === "us" || units === "uk" || units === "ca") {
    return { tempF: Math.round(temp), tempC: fToC(temp) };
  }
  return { tempC: Math.round(temp), tempF: cToF(temp) };
}

function normalizeWindMph(speed: number, units?: string): number {
  if (units === "us" || units === "uk") return Math.round(speed);
  if (units === "ca") return kphToMph(speed);
  return mpsToMph(speed);
}

function rainChanceFromPoint(d: MeteosourcePointResponse): number {
  const hourlyProb = d.hourly?.data?.[0]?.probability?.precipitation;
  if (typeof hourlyProb === "number") return Math.min(100, Math.round(hourlyProb));

  const precipTotal = d.current?.precipitation?.total;
  if (typeof precipTotal === "number" && precipTotal > 0) {
    return Math.min(100, Math.round(precipTotal * 20));
  }
  return 0;
}

/** Normalize Meteosource /point JSON into app weather shape. */
export function normalizeMeteosourcePoint(
  raw: MeteosourcePointResponse,
  displayCity: string
): WeatherData | null {
  const current = raw.current;
  if (!current || typeof current.temperature !== "number") return null;

  const iconNum = current.icon_num ?? Number(current.icon);
  const icon = Number.isFinite(iconNum) ? String(iconNum) : "1";
  const { tempC, tempF } = normalizeTemperature(current.temperature, raw.units);
  const description = current.summary ?? current.weather ?? "";

  return {
    city: displayCity,
    tempF,
    tempC,
    description,
    icon,
    rainChancePercent: rainChanceFromPoint(raw),
    humidity: current.humidity ?? 0,
    windMph: normalizeWindMph(current.wind?.speed ?? 0, raw.units),
  };
}

async function fetchMeteosource(path: string): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, { headers: rapidHeaders() });
}

async function handleWeatherResponse(
  res: Response,
  context: Record<string, string | number>
): Promise<WeatherData | null> {
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    weatherSessionDisabled = true;
    markProxyDead("weather", `HTTP ${res.status}`);
    const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
    logger.warn("WeatherClient blocked for session", "WeatherClient", {
      status: res.status,
      bodySnippet,
      ...context,
    });
    return null;
  }

  if (!res.ok) {
    if (res.status >= 500) {
      markProxyDead("weather", `HTTP ${res.status}`);
    }
    logger.warn("WeatherClient non-OK response", "WeatherClient", {
      status: res.status,
      ...context,
    });
    return null;
  }

  const raw = (await res.json()) as MeteosourcePointResponse;
  const city = typeof context.city === "string" ? context.city : "Stadium";
  return normalizeMeteosourcePoint(raw, city);
}

/** Live conditions at stadium coordinates — preferred for WC 2026 venues. */
export async function getWeatherByCoords(
  lat: number,
  lon: number,
  displayCity: string
): Promise<WeatherData | null> {
  if (weatherSessionDisabled) return null;

  const path = weatherEndpoints.point({ lat, lon, sections: "current,hourly", units: "auto" });

  try {
    const res = await fetchMeteosource(path);
    return handleWeatherResponse(res, { lat, lon, city: displayCity });
  } catch (error) {
    logger.warn("WeatherClient fetch failed", "WeatherClient", {
      error: error instanceof Error ? error.message : String(error),
      lat,
      lon,
      city: displayCity,
    });
    return null;
  }
}

/** City-name fallback via Meteosource place search, then /point. */
export async function getWeatherByCity(city: string): Promise<WeatherData | null> {
  if (weatherSessionDisabled) return null;

  const searchPath = weatherEndpoints.findPlaces(city);
  try {
    const searchRes = await fetchMeteosource(searchPath);
    if (!searchRes.ok) {
      return handleWeatherResponse(searchRes, { city });
    }

    const places = (await searchRes.json()) as Array<{ lat?: string; lon?: string; name?: string }>;
    const first = places[0];
    if (!first?.lat || !first?.lon) {
      logger.warn("WeatherClient place lookup empty", "WeatherClient", { city });
      return null;
    }

    const lat = parseCoord(first.lat);
    const lon = parseCoord(first.lon);
    if (lat === null || lon === null) return null;

    return getWeatherByCoords(lat, lon, first.name ?? city);
  } catch (error) {
    logger.warn("WeatherClient city lookup failed", "WeatherClient", {
      error: error instanceof Error ? error.message : String(error),
      city,
    });
    return null;
  }
}

function parseCoord(value: string): number | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*([NSEW])?$/i);
  if (!match) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  const dir = match[2]?.toUpperCase();
  if (dir === "S" || dir === "W") return -magnitude;
  return magnitude;
}

export function getWeatherIconUrl(icon: string): string {
  const iconNum = Number(icon);
  if (Number.isFinite(iconNum) && iconNum >= 1 && iconNum <= 36) {
    return `https://www.meteosource.com/static/img/ico/weather/${iconNum}.svg`;
  }
  if (icon) {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  }
  return "";
}

/** Test-only reset */
export function resetWeatherSessionForTests(): void {
  weatherSessionDisabled = false;
}
