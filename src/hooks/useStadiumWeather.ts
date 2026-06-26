import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "../types";
import { getVenueCoords } from "../data/venueCoordinates";
import { getWeather } from "../services/WeatherCache";

function parseVenueName(venueString: string | undefined): string | undefined {
  if (!venueString) return undefined;
  const trimmed = venueString.trim();
  if (!trimmed) return undefined;
  const byComma = trimmed.split(",")[0]?.trim();
  return byComma || trimmed;
}

/** Fetches weather for a match venue string with cache. */
export function useStadiumWeather(venueString: string | undefined): {
  weather: WeatherSnapshot | null;
  loading: boolean;
} {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const venueName = parseVenueName(venueString);
    if (!venueName) {
      setWeather(null);
      return;
    }

    const coords = getVenueCoords(venueName);
    const city = coords?.city ?? venueName;

    let cancelled = false;
    setLoading(true);

    void getWeather(city).then((data) => {
      if (cancelled) return;
      setLoading(false);
      if (!data) {
        setWeather(null);
        return;
      }
      setWeather({
        city: data.city,
        tempC: data.tempC,
        tempF: data.tempF,
        condition: data.description,
        icon: data.icon,
        humidity: data.humidity,
        windKph: Math.round(data.windMph * 1.609),
        fetchedAt: Date.now(),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [venueString]);

  return { weather, loading };
}
