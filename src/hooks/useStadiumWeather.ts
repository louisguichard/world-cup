import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "../types";
import type { WeatherLocationInput } from "../lib/weather/resolveHostCityWeather";
import { resolveHostCityWeather } from "../lib/weather/resolveHostCityWeather";
import { getWeather } from "../services/WeatherCache";

/** Fetches weather once per venue — cold tier, no polling. */
export function useStadiumWeather(input: WeatherLocationInput): {
  weather: WeatherSnapshot | null;
  loading: boolean;
} {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const entry = resolveHostCityWeather(input);
  const lookupKey = entry?.id ?? input.cityHint ?? input.venueString ?? input.matchId ?? "";

  useEffect(() => {
    if (!entry) {
      setWeather(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);

    void getWeather(input).then((data) => {
      if (ac.signal.aborted) return;
      setLoading(false);
      if (!data) {
        setWeather(null);
        return;
      }
      setWeather({
        city: data.city,
        tempC: data.tempC,
        tempF: data.tempF,
        condition: data.condition,
        iconKind: data.iconKind,
        icon: data.icon,
        humidity: data.humidity,
        windKph: Math.round(data.windMph * 1.609),
        fetchedAt: Date.now(),
        source: data.source,
      });
    });

    return () => ac.abort();
  }, [lookupKey, entry]);

  return { weather, loading };
}
