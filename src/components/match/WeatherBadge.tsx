import type { WeatherLocationInput } from "../../lib/weather/resolveHostCityWeather";
import { useStadiumWeather } from "../../hooks/useStadiumWeather";
import { LoadingBall } from "../shared/LoadingBall";
import { WeatherIcon } from "./WeatherIcon";

type Props = WeatherLocationInput & {
  showLoading?: boolean;
};

export function WeatherBadge({ matchId, venueString, cityHint, showLoading }: Props) {
  const { weather, loading } = useStadiumWeather({ matchId, venueString, cityHint });

  if (loading && showLoading) {
    return (
      <span className="weather-badge weather-badge--loading" aria-hidden>
        <LoadingBall size="xs" aria-hidden />
      </span>
    );
  }

  if (loading || !weather) return null;

  return (
    <span className="weather-badge" title={`${weather.city}: ${weather.condition}`}>
      <WeatherIcon kind={weather.iconKind} className="weather-badge-icon" />
      <span className="weather-badge-temp">{weather.tempF}°F</span>
    </span>
  );
}
