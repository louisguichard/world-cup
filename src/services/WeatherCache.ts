import { isApiEnabled } from "../config/apiFlags";
import { resolveHostCityWeather, type WeatherLocationInput } from "../lib/weather/resolveHostCityWeather";
import {
  getWeatherForLocation,
  isWeatherDisabled,
  type WeatherData,
} from "./WeatherClient";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  data: WeatherData;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<WeatherData | null>>();

function cacheKey(hostCityId: string): string {
  return hostCityId;
}

export async function getWeather(input: WeatherLocationInput): Promise<WeatherData | null> {
  if (!isApiEnabled("yahooWeather") && !isApiEnabled("openWeather")) return null;
  if (isWeatherDisabled()) return null;

  const entry = resolveHostCityWeather(input);
  if (!entry) return null;

  const key = cacheKey(entry.id);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = getWeatherForLocation(input).then((data) => {
    inFlight.delete(key);
    if (data) {
      cache.set(key, { data, fetchedAt: Date.now() });
    }
    return data;
  });

  inFlight.set(key, promise);
  return promise;
}

/** Invalidate a host city entry (e.g. for tests). */
export function invalidateWeatherCache(hostCityId?: string): void {
  if (hostCityId) {
    cache.delete(cacheKey(hostCityId));
  } else {
    cache.clear();
  }
}
