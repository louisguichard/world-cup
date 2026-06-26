import { getWeatherIconUrl } from "../../services/WeatherClient";
import { useStadiumWeather } from "../../hooks/useStadiumWeather";

type Props = { city: string };

export function WeatherBadge({ city }: Props) {
  const { weather, loading } = useStadiumWeather(city);

  if (loading || !weather) return null;

  return (
    <span className="weather-badge" title={`${weather.city}: ${weather.condition}`}>
      {weather.icon ? (
        <img
          src={getWeatherIconUrl(weather.icon)}
          alt={weather.condition}
          width={16}
          height={16}
          className="weather-badge-icon"
        />
      ) : null}
      <span className="weather-badge-temp">{weather.tempF}°F</span>
    </span>
  );
}
