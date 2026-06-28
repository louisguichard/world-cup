import {
  lookupHostCityWeatherHint,
  type HostCityWeatherEntry,
} from "../../data/venues/hostCityWeatherCatalog";
import { resolveVenueFromMatch } from "../venue/resolveVenue";

export type WeatherLocationInput = {
  matchId?: string;
  venueString?: string;
  cityHint?: string;
};

function stadiumFromVenueString(venueString: string | undefined): string | undefined {
  if (!venueString?.trim()) return undefined;
  const trimmed = venueString.trim();
  const byComma = trimmed.split(",")[0]?.trim();
  return byComma || trimmed;
}

/** Resolve any match/stadium/city hint to one of the 16 canonical host city weather entries. */
export function resolveHostCityWeather(input: WeatherLocationInput): HostCityWeatherEntry | null {
  const venue = resolveVenueFromMatch(input.matchId, input.venueString);
  if (venue) {
    const bySlug = lookupHostCityWeatherHint(venue.slug);
    if (bySlug) return bySlug;
    const byHost = lookupHostCityWeatherHint(venue.hostCity);
    if (byHost) return byHost;
    const byCity = lookupHostCityWeatherHint(venue.city);
    if (byCity) return byCity;
    const byStadium = lookupHostCityWeatherHint(venue.stadiumName);
    if (byStadium) return byStadium;
  }

  const stadium = stadiumFromVenueString(input.venueString);
  if (stadium) {
    const hit = lookupHostCityWeatherHint(stadium);
    if (hit) return hit;
  }

  if (input.cityHint) {
    const hit = lookupHostCityWeatherHint(input.cityHint);
    if (hit) return hit;
  }

  return null;
}
