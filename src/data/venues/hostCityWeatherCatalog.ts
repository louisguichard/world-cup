import { VENUE_COORDINATES } from "../venueCoordinates";
import { normalizeStadiumName } from "./venueAliases";
import { EXPECTED_VENUE_COUNT, VENUE_ENRICHMENTS } from "./venueIndex";

/** Canonical Yahoo Weather `location` query for each of the 16 host cities. */
export const YAHOO_LOCATION_BY_HOST_SLUG: Record<string, string> = {
  atlanta: "atlanta",
  boston: "foxborough",
  dallas: "arlington",
  guadalajara: "guadalajara",
  houston: "houston",
  "kansas-city": "kansas city",
  "los-angeles": "inglewood",
  "mexico-city": "mexico city",
  miami: "miami",
  monterrey: "monterrey",
  "new-york-new-jersey": "east rutherford",
  philadelphia: "philadelphia",
  "san-francisco-bay-area": "santa clara",
  seattle: "seattle",
  toronto: "toronto",
  vancouver: "vancouver",
};

export type HostCityWeatherEntry = {
  id: string;
  hostCity: string;
  displayCity: string;
  yahooLocation: string;
  openWeatherCity: string;
  country: string;
};

export const HOST_CITY_WEATHER_CATALOG: HostCityWeatherEntry[] = VENUE_ENRICHMENTS.map((venue) => ({
  id: venue.slug,
  hostCity: venue.hostCity,
  displayCity: venue.hostCity,
  yahooLocation: YAHOO_LOCATION_BY_HOST_SLUG[venue.slug] ?? venue.city.toLowerCase(),
  openWeatherCity: venue.city,
  country: venue.country,
}));

if (HOST_CITY_WEATHER_CATALOG.length !== EXPECTED_VENUE_COUNT) {
  throw new Error(
    `Host city weather catalog expected ${EXPECTED_VENUE_COUNT} entries, got ${HOST_CITY_WEATHER_CATALOG.length}`
  );
}

export const hostCityWeatherById: Record<string, HostCityWeatherEntry> = Object.fromEntries(
  HOST_CITY_WEATHER_CATALOG.map((entry) => [entry.id, entry])
);

export function normalizeWeatherHint(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function registerAlias(
  map: Record<string, HostCityWeatherEntry>,
  raw: string | undefined,
  entry: HostCityWeatherEntry
): void {
  if (!raw?.trim()) return;
  map[normalizeWeatherHint(raw)] = entry;
}

export function buildHostCityWeatherAliases(): Record<string, HostCityWeatherEntry> {
  const map: Record<string, HostCityWeatherEntry> = {};

  for (const entry of HOST_CITY_WEATHER_CATALOG) {
    const venue = VENUE_ENRICHMENTS.find((v) => v.slug === entry.id);
    if (!venue) continue;

    registerAlias(map, entry.id, entry);
    registerAlias(map, entry.hostCity, entry);
    registerAlias(map, entry.displayCity, entry);
    registerAlias(map, entry.yahooLocation, entry);
    registerAlias(map, entry.openWeatherCity, entry);
    registerAlias(map, venue.stadiumName, entry);
    registerAlias(map, normalizeStadiumName(venue.stadiumName), entry);
    for (const alias of venue.aliases ?? []) {
      registerAlias(map, alias, entry);
      registerAlias(map, normalizeStadiumName(alias), entry);
    }
  }

  for (const [stadiumName, coords] of Object.entries(VENUE_COORDINATES)) {
    const byCity = map[normalizeWeatherHint(coords.city)];
    if (!byCity) continue;
    registerAlias(map, stadiumName, byCity);
    registerAlias(map, normalizeStadiumName(stadiumName), byCity);
    registerAlias(map, coords.city, byCity);
  }

  registerAlias(map, "new york", hostCityWeatherById["new-york-new-jersey"]!);
  registerAlias(map, "new york/new jersey", hostCityWeatherById["new-york-new-jersey"]!);
  registerAlias(map, "new york new jersey", hostCityWeatherById["new-york-new-jersey"]!);
  registerAlias(map, "sf bay area", hostCityWeatherById["san-francisco-bay-area"]!);
  registerAlias(map, "san francisco", hostCityWeatherById["san-francisco-bay-area"]!);
  registerAlias(map, "miami gardens", hostCityWeatherById.miami!);
  registerAlias(map, "guadalupe", hostCityWeatherById.monterrey!);
  registerAlias(map, "santa clara", hostCityWeatherById["san-francisco-bay-area"]!);
  registerAlias(map, "east rutherford", hostCityWeatherById["new-york-new-jersey"]!);
  registerAlias(map, "foxborough", hostCityWeatherById.boston!);
  registerAlias(map, "arlington", hostCityWeatherById.dallas!);
  registerAlias(map, "inglewood", hostCityWeatherById["los-angeles"]!);

  return map;
}

export const hostCityWeatherAliases = buildHostCityWeatherAliases();

export function lookupHostCityWeatherHint(hint: string | undefined): HostCityWeatherEntry | null {
  if (!hint?.trim()) return null;
  return hostCityWeatherAliases[normalizeWeatherHint(hint)] ?? null;
}
