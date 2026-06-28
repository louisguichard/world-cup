import type { WeatherIconKind } from "../types";

export type WeatherProvider = "yahoo" | "openweather";

export type WeatherData = {
  city: string;
  tempF: number;
  tempC: number;
  condition: string;
  iconKind: WeatherIconKind;
  /** Provider-specific icon token (legacy OpenWeather code or Yahoo numeric code). */
  icon: string;
  rainChancePercent: number;
  humidity: number;
  windMph: number;
  source: WeatherProvider;
};
