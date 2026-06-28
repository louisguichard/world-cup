import { markProxyDead } from "../lib/proxyHealthMonitor";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { yahooCodeToIconKind } from "../lib/weather/yahooConditionIcon";
import { logger } from "./Logger";
import type { WeatherData } from "./weatherTypes";

const RAPIDAPI_HOST =
  providerByHost("yahoo-weather5.p.rapidapi.com")?.host ?? "yahoo-weather5.p.rapidapi.com";

let yahooWeatherSessionDisabled = false;

export function isYahooWeatherDisabled(): boolean {
  return yahooWeatherSessionDisabled;
}

type YahooWeatherResponse = {
  location?: { city?: string };
  current_observation?: {
    wind?: { speed?: number };
    atmosphere?: { humidity?: number };
    condition?: { text?: string; code?: number; temperature?: number };
  };
  forecasts?: Array<{ code?: number; text?: string }>;
};

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  return "/api/yahoo-weather";
}

function celsiusFromFahrenheit(tempF: number): number {
  return Math.round(((tempF - 32) * 5) / 9);
}

function rainChanceFromForecasts(forecasts: YahooWeatherResponse["forecasts"]): number {
  const today = forecasts?.[0];
  if (!today?.text) return 0;
  const text = today.text.toLowerCase();
  if (text.includes("thunder")) return 80;
  if (text.includes("rain") || text.includes("shower")) return 65;
  if (text.includes("snow")) return 55;
  if (text.includes("cloud")) return 20;
  return 0;
}

export async function getYahooWeatherByLocation(location: string): Promise<WeatherData | null> {
  if (yahooWeatherSessionDisabled) return null;

  const params = new URLSearchParams({
    location,
    format: "json",
    u: "f",
  });
  const url = `${baseUrl()}/weather?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: rapidApiHeaders(RAPIDAPI_HOST) });

    if (res.status === 401 || res.status === 403 || res.status === 429) {
      yahooWeatherSessionDisabled = true;
      markProxyDead("weather", `Yahoo Weather HTTP ${res.status}`);
      logger.warn("YahooWeather blocked for session", "YahooWeatherClient", { status: res.status });
      return null;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        markProxyDead("weather", `Yahoo Weather HTTP ${res.status}`);
      }
      logger.warn("YahooWeather non-OK response", "YahooWeatherClient", {
        status: res.status,
        location,
      });
      return null;
    }

    const payload = (await res.json()) as YahooWeatherResponse;
    const observation = payload.current_observation;
    const condition = observation?.condition;
    if (!condition || condition.temperature == null) {
      logger.warn("YahooWeather missing observation", "YahooWeatherClient", { location });
      return null;
    }

    const code = condition.code ?? 44;
    const tempF = Math.round(condition.temperature);

    return {
      city: payload.location?.city ?? location,
      tempF,
      tempC: celsiusFromFahrenheit(tempF),
      condition: condition.text ?? "Unknown",
      iconKind: yahooCodeToIconKind(code),
      icon: String(code),
      rainChancePercent: rainChanceFromForecasts(payload.forecasts),
      humidity: observation.atmosphere?.humidity ?? 0,
      windMph: Math.round(observation.wind?.speed ?? 0),
      source: "yahoo",
    };
  } catch (error) {
    logger.warn("YahooWeather fetch failed", "YahooWeatherClient", {
      error: error instanceof Error ? error.message : String(error),
      location,
    });
    return null;
  }
}

export function resetYahooWeatherSessionForTests(): void {
  yahooWeatherSessionDisabled = false;
}
