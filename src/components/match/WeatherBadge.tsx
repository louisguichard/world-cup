import type { WeatherLocationInput } from "../../lib/weather/resolveHostCityWeather";
import { useStadiumWeather } from "../../hooks/useStadiumWeather";
import { WeatherIcon } from "./WeatherIcon";

type Props = WeatherLocationInput;

export function WeatherBadge({ matchId, venueString, cityHint }: Props) {
  const { weather, loading } = useStadiumWeather({ matchId, venueString, cityHint });

  if (loading || !weather) return null;

  return (
    <span className="weather-badge" title={`${weather.city}: ${weather.condition}`}>
      <WeatherIcon kind={weather.iconKind} className="weather-badge-icon" />
      <span className="weather-badge-temp">{weather.tempF}°F</span>
    </span>
  );
}
