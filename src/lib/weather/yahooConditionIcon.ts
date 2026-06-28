import type { WeatherIconKind } from "../../types";

/** Maps Yahoo condition codes to semantic icon kinds for UI. */
export function yahooCodeToIconKind(code: number): WeatherIconKind {
  switch (code) {
    case 31:
    case 33:
      return "clear-night";
    case 32:
    case 34:
    case 36:
      return "clear-day";
    case 27:
    case 29:
      return "partly-cloudy-night";
    case 28:
    case 30:
      return "partly-cloudy-day";
    case 26:
    case 25:
      return "cloudy";
    case 11:
    case 39:
    case 45:
      return "showers";
    case 12:
    case 40:
      return "rain";
    case 4:
    case 17:
    case 35:
    case 37:
    case 38:
    case 47:
      return "thunderstorm";
    case 5:
    case 13:
    case 14:
    case 15:
    case 16:
    case 41:
    case 42:
    case 43:
    case 46:
      return "snow";
    case 20:
    case 21:
    case 19:
      return "fog";
    case 22:
    case 23:
    case 24:
      return "wind";
    default:
      return "unknown";
  }
}

export function openWeatherIconToKind(icon: string): WeatherIconKind {
  if (icon.endsWith("n")) {
    if (icon.startsWith("01")) return "clear-night";
    if (icon.startsWith("02")) return "partly-cloudy-night";
    return "cloudy";
  }
  if (icon.startsWith("01")) return "clear-day";
  if (icon.startsWith("02")) return "partly-cloudy-day";
  if (icon.startsWith("03") || icon.startsWith("04")) return "cloudy";
  if (icon.startsWith("09")) return "showers";
  if (icon.startsWith("10")) return "rain";
  if (icon.startsWith("11")) return "thunderstorm";
  if (icon.startsWith("13")) return "snow";
  if (icon.startsWith("50")) return "fog";
  return "unknown";
}
