import { isApiEnabled } from "../config/apiFlags";
import type { HostCityWeatherEntry } from "../data/venues/hostCityWeatherCatalog";
import {
  resolveHostCityWeather,
  type WeatherLocationInput,
} from "../lib/weather/resolveHostCityWeather";
import {
  getOpenWeatherByCity,
  isOpenWeatherDisabled,
  resetOpenWeatherSessionForTests,
} from "./OpenWeatherClient";
import {
  getYahooWeatherByLocation,
  isYahooWeatherDisabled,
  resetYahooWeatherSessionForTests,
} from "./YahooWeatherClient";
import type { WeatherData } from "./weatherTypes";

export type { WeatherData } from "./weatherTypes";

export function isWeatherDisabled(): boolean {
  const yahooEnabled = isApiEnabled("yahooWeather") && !isYahooWeatherDisabled();
  const openEnabled = isApiEnabled("openWeather") && !isOpenWeatherDisabled();
  return !yahooEnabled && !openEnabled;
}

export async function getWeatherForHostCity(entry: HostCityWeatherEntry): Promise<WeatherData | null> {
  if (isApiEnabled("yahooWeather") && !isYahooWeatherDisabled()) {
    const yahoo = await getYahooWeatherByLocation(entry.yahooLocation);
    if (yahoo) {
      return { ...yahoo, city: entry.displayCity };
    }
  }

  if (isApiEnabled("openWeather") && !isOpenWeatherDisabled()) {
    const fallback = await getOpenWeatherByCity(entry.openWeatherCity);
    if (fallback) {
      return { ...fallback, city: entry.displayCity };
    }
  }

  return null;
}

export async function getWeatherForLocation(input: WeatherLocationInput): Promise<WeatherData | null> {
  const entry = resolveHostCityWeather(input);
  if (!entry) return null;
  return getWeatherForHostCity(entry);
}

/** @deprecated Use getWeatherForLocation — kept for enrichment callers passing raw city strings. */
export async function getWeatherByCity(city: string): Promise<WeatherData | null> {
  return getWeatherForLocation({ cityHint: city });
}

export function resetWeatherSessionForTests(): void {
  resetOpenWeatherSessionForTests();
  resetYahooWeatherSessionForTests();
}
