import type { ResolvedVenue } from "../lib/venue/types";
import { gettyWorldCupQueries } from "../services/gettyImages/gettyWorldCupQueries";
import { useGettyImage } from "./useGettyImage";

export function useGettyVenueHero(venue: ResolvedVenue | null) {
  const phrase = venue ? gettyWorldCupQueries.venue(venue) : null;
  return useGettyImage(phrase);
}

export function useGettyMatchHero(homeTeamName?: string, awayTeamName?: string) {
  const phrase =
    homeTeamName && awayTeamName
      ? gettyWorldCupQueries.matchFixture(homeTeamName, awayTeamName)
      : null;
  return useGettyImage(phrase);
}

export function useGettyHostCityHero(city?: string) {
  const phrase = city ? gettyWorldCupQueries.hostCity(city) : null;
  return useGettyImage(phrase);
}

export function useGettyPlayerPhoto(playerName?: string) {
  const phrase = playerName ? gettyWorldCupQueries.player(playerName) : null;
  return useGettyImage(phrase);
}
