/**
 * RapidAPI AI Weather by Meteosource — paths for live game conditions.
 * @see https://rapidapi.com/MeteosourceWeather/api/ai-weather-by-meteosource
 */

export const METEOSOURCE_HOST = "ai-weather-by-meteosource.p.rapidapi.com";

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type MeteosourceSection = "current" | "hourly" | "daily" | "minutely" | "alerts";

export const weatherEndpoints = {
  /** Current + short forecast — primary path for live matches at stadium coordinates. */
  point: (opts: {
    lat: number;
    lon: number;
    sections?: MeteosourceSection[] | string;
    units?: "auto" | "metric" | "us" | "uk" | "ca";
    timezone?: string;
    language?: string;
  }) => {
    const sections =
      typeof opts.sections === "string"
        ? opts.sections
        : (opts.sections ?? ["current", "hourly"]).join(",");
    return `/point${q({
      lat: opts.lat,
      lon: opts.lon,
      sections,
      units: opts.units ?? "auto",
      timezone: opts.timezone,
      language: opts.language ?? "en",
    })}`;
  },

  /** Historical conditions for a past date (e.g. replay / archive views). */
  timeMachine: (opts: {
    lat: number;
    lon: number;
    date: string;
    units?: "auto" | "metric" | "us" | "uk" | "ca";
  }) =>
    `/time_machine${q({
      lat: opts.lat,
      lon: opts.lon,
      date: opts.date,
      units: opts.units ?? "auto",
    })}`,

  findPlaces: (text: string, language = "en") =>
    `/find_places${q({ text, language })}`,

  findPlacesPrefix: (text: string, language = "en") =>
    `/find_places_prefix${q({ text, language })}`,
} as const;
