import { describe, expect, it } from "vitest";
import {
  getWeatherIconUrl,
  normalizeMeteosourcePoint,
} from "./WeatherClient";

describe("WeatherClient normalize", () => {
  it("normalizes Meteosource point response (metric)", () => {
    const data = normalizeMeteosourcePoint(
      {
        units: "metric",
        current: {
          icon_num: 6,
          summary: "Cloudy",
          temperature: 28.4,
          humidity: 72,
          wind: { speed: 12.5, dir: "NE" },
          precipitation: { total: 0, type: "none" },
        },
        hourly: {
          data: [{ probability: { precipitation: 35 } }],
        },
      },
      "Miami"
    );

    expect(data).toMatchObject({
      city: "Miami",
      tempC: 28,
      tempF: 83,
      description: "Cloudy",
      icon: "6",
      rainChancePercent: 35,
      humidity: 72,
      windMph: 28,
    });
  });

  it("normalizes Meteosource point response (US units)", () => {
    const data = normalizeMeteosourcePoint(
      {
        units: "us",
        current: {
          icon_num: 2,
          weather: "Sunny",
          temperature: 84.8,
          humidity: 50,
          wind: { speed: 16.3, dir: "WSW" },
        },
      },
      "Hard Rock Stadium"
    );

    expect(data).toMatchObject({
      tempF: 85,
      tempC: 29,
      description: "Sunny",
      icon: "2",
      windMph: 16,
      rainChancePercent: 0,
    });
  });

  it("returns null when current temperature is missing", () => {
    expect(normalizeMeteosourcePoint({ current: {} }, "Test")).toBeNull();
  });

  it("builds Meteosource icon URLs from icon_num", () => {
    expect(getWeatherIconUrl("6")).toBe(
      "https://www.meteosource.com/static/img/ico/weather/6.svg"
    );
  });

  it("falls back to OpenWeather icon URL for legacy codes", () => {
    expect(getWeatherIconUrl("01d")).toBe(
      "https://openweathermap.org/img/wn/01d@2x.png"
    );
  });
});
