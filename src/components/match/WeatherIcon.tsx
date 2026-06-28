import type { WeatherIconKind } from "../../types";

type Props = {
  kind: WeatherIconKind;
  className?: string;
};

const ICON_PATHS: Record<WeatherIconKind, string> = {
  "clear-day":
    "M12 4a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6.5-4a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V13a1 1 0 0 1 1-1Zm-13 0a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V13a1 1 0 0 1 1-1ZM16.95 7.05a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.42-1.42l1.06-1.05a1 1 0 0 1 1.42 0ZM7.05 16.95a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.42-1.42l1.06-1.05a1 1 0 0 1 1.42 0Zm9.9 0a1 1 0 0 1 1.42 0l1.06 1.06a1 1 0 0 1-1.42 1.42l-1.06-1.06a1 1 0 0 1 0-1.42ZM7.05 7.05a1 1 0 0 1 0 1.41L6 9.52a1 1 0 1 1-1.42-1.42l1.06-1.05a1 1 0 0 1 1.41 0Z",
  "clear-night":
    "M14.5 4.5a5.5 5.5 0 1 0 5.2 7.3 4.5 4.5 0 1 1-5.2-7.3Z",
  "partly-cloudy-day":
    "M8 17h8a4 4 0 0 0 .3-8 5 5 0 0 0-9.7 1.2A3.5 3.5 0 0 0 8 17Zm6-6.5a1 1 0 0 1 1-1h.5a1 1 0 1 1 0 2H15a1 1 0 0 1-1-1Z",
  "partly-cloudy-night":
    "M14 5.5a4.5 4.5 0 0 0-3.8 7 4 4 0 0 0 3.8 2.5H15a3 3 0 0 0 2.9-3.8A4.5 4.5 0 0 0 14 5.5Z",
  cloudy: "M7 17h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.3A3 3 0 0 0 7 17Z",
  rain: "M8 15h8a3 3 0 0 0 .2-6 4.5 4.5 0 0 0-8.6 1.1A2.5 2.5 0 0 0 8 15Zm1 3.5a1 1 0 0 1 2 0v1a1 1 0 1 1-2 0v-1Zm4 0a1 1 0 0 1 2 0v1a1 1 0 1 1-2 0v-1Z",
  showers:
    "M8 14h8a3 3 0 0 0 .2-6 4.5 4.5 0 0 0-8.6 1.1A2.5 2.5 0 0 0 8 14Zm2 3.5a.75.75 0 0 1 1.5 0v.75a.75.75 0 0 1-1.5 0v-.75Zm3 0a.75.75 0 0 1 1.5 0v.75a.75.75 0 0 1-1.5 0v-.75Z",
  thunderstorm:
    "M8 14h8a3 3 0 0 0 .2-6 4.5 4.5 0 0 0-8.6 1.1A2.5 2.5 0 0 0 8 14Zm2.5 2.5 1 2.5h1l-1.25 2.5 2.25-1.25-1 2h-1.5l1.25-2.5-2.25 1.25 1-2.5h1.5Z",
  snow: "M8 15h8a3 3 0 0 0 .2-6 4.5 4.5 0 0 0-8.6 1.1A2.5 2.5 0 0 0 8 15Zm1 3 1-1.2 1 1.2 1.2-1-1.2-1 1.2-1-1.2-1.2 1ZM13 18l1-1.2 1 1.2 1.2-1-1.2-1 1.2-1-1.2-1-1.2 1Z",
  fog: "M6 13h12M5 16h14M7 10h10a2 2 0 0 0 .1-4H7a2 2 0 0 0 0 4Z",
  wind: "M6 9h8a2 2 0 1 0 0-4H7M6 15h10a2 2 0 1 1 0 4H8M10 12h6",
  unknown: "M12 7v5l3 2",
};

export function WeatherIcon({ kind, className }: Props) {
  const path = ICON_PATHS[kind] ?? ICON_PATHS.unknown;
  const compound = ["weather-icon", className].filter(Boolean).join(" ");

  return (
    <svg
      className={compound}
      viewBox="0 0 24 24"
      width={16}
      height={16}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d={path} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
