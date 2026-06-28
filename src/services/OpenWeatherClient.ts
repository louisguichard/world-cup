import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { openWeatherIconToKind } from "../lib/weather/yahooConditionIcon";
import { logger } from "./Logger";
import type { WeatherData } from "./weatherTypes";

const RAPIDAPI_HOST =
  providerByHost("open-weather13.p.rapidapi.com")?.host ?? "open-weather13.p.rapidapi.com";

let openWeatherSessionDisabled = false;

export function isOpenWeatherDisabled(): boolean {
  return openWeatherSessionDisabled;
}

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

function kelvinToF(k: number): number {
  return Math.round(((k - 273.15) * 9) / 5 + 32);
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

export async function getOpenWeatherByCity(city: string, lang = "EN"): Promise<WeatherData | null> {
  if (openWeatherSessionDisabled) return null;

  const encodedCity = encodeURIComponent(city);
  const url = `${baseUrl()}/city?city=${encodedCity}&lang=${lang}`;

  try {
    const res = await fetch(url, { headers: rapidApiHeaders(RAPIDAPI_HOST) });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      openWeatherSessionDisabled = true;
      markProxyDead("weather", `Open Weather HTTP ${res.status}`);
      logger.warn("OpenWeather blocked for session", "OpenWeatherClient", { status: res.status });
      return null;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        markProxyDead("weather", `Open Weather HTTP ${res.status}`);
      }
      logger.warn("OpenWeather non-OK response", "OpenWeatherClient", { status: res.status, city });
      return null;
    }

    const d = (await res.json()) as OpenWeatherResponse;
    const tempK = d.main?.temp ?? 293;
    const icon = d.weather?.[0]?.icon ?? "";

    return {
      city: d.name ?? city,
      tempF: kelvinToF(tempK),
      tempC: kelvinToC(tempK),
      condition: d.weather?.[0]?.description ?? "",
      iconKind: openWeatherIconToKind(icon),
      icon,
      rainChancePercent: rainToPercent(d.rain?.["1h"]),
      humidity: d.main?.humidity ?? 0,
      windMph: mpsToMph(d.wind?.speed ?? 0),
      source: "openweather",
    };
  } catch (error) {
    logger.warn("OpenWeather fetch failed", "OpenWeatherClient", {
      error: error instanceof Error ? error.message : String(error),
      city,
    });
    return null;
  }
}

export function resetOpenWeatherSessionForTests(): void {
  openWeatherSessionDisabled = false;
}
