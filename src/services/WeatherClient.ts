import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("open-weather13.p.rapidapi.com")?.host ?? "open-weather13.p.rapidapi.com";

let weatherSessionDisabled = false;

export function isWeatherDisabled(): boolean {
  return weatherSessionDisabled;
}

export type WeatherData = {
  city: string;
  tempF: number;
  tempC: number;
  description: string;
  icon: string;
  rainChancePercent: number;
  humidity: number;
  windMph: number;
};

type OpenWeatherResponse = {
  name?: string;
  main?: { temp?: number; humidity?: number };
  weather?: Array<{ description?: string; icon?: string }>;
  wind?: { speed?: number };
  rain?: { "1h"?: number };
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

function kelvinToF(k: number): number {
  return Math.round((k - 273.15) * 9 / 5 + 32);
}

function kelvinToC(k: number): number {
  return Math.round(k - 273.15);
}

function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237);
}

function rainToPercent(rain1h?: number): number {
  if (!rain1h) return 0;
  return Math.min(100, Math.round(rain1h * 20));
}

export async function getWeatherByCity(city: string, lang = "EN"): Promise<WeatherData | null> {
  if (weatherSessionDisabled) return null;

  const encodedCity = encodeURIComponent(city);
  const url = `${baseUrl()}/city?city=${encodedCity}&lang=${lang}`;

  try {
    const res = await fetch(url, { headers: rapidHeaders() });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      weatherSessionDisabled = true;
      markProxyDead("weather", `HTTP ${res.status}`);
      const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
      logger.warn("WeatherClient blocked for session", "WeatherClient", {
        status: res.status,
        bodySnippet,
      });
      return null;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        markProxyDead("weather", `HTTP ${res.status}`);
      }
      logger.warn("WeatherClient non-OK response", "WeatherClient", { status: res.status, city });
      return null;
    }

    const d = (await res.json()) as OpenWeatherResponse;
    const tempK = d.main?.temp ?? 293;

    return {
      city: d.name ?? city,
      tempF: kelvinToF(tempK),
      tempC: kelvinToC(tempK),
      description: d.weather?.[0]?.description ?? "",
      icon: d.weather?.[0]?.icon ?? "",
      rainChancePercent: rainToPercent(d.rain?.["1h"]),
      humidity: d.main?.humidity ?? 0,
      windMph: mpsToMph(d.wind?.speed ?? 0),
    };
  } catch (error) {
    logger.warn("WeatherClient fetch failed", "WeatherClient", {
      error: error instanceof Error ? error.message : String(error),
      city,
    });
    return null;
  }
}

export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

/** Test-only reset */
export function resetWeatherSessionForTests(): void {
  weatherSessionDisabled = false;
}
