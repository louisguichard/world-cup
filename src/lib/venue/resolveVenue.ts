import scheduleData from "../../data/matchSchedule.json";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { getVenueCoords } from "../../data/venueCoordinates";
import { normalizeStadiumName } from "../../data/venues/venueAliases";
import {
  getVenueBySlug,
  getVenueByStadiumName,
  venuesBySlug
} from "../../data/venues/venueIndex";
import { getBroadcast } from "../../services/BroadcastLookup";
import { getPaninarrVenueImages } from "../../data/paninarrVenueHeroes";
import { getFifaVenueSupplement } from "./fifaVenueSupplement";
import type { ResolvedVenue, VenueEnrichment } from "./types";

type ScheduleVenueCatalogEntry = {
  city: string;
  state?: string | null;
  country: string;
  fifaName: string;
  capacity: number;
  tz: string;
};

const scheduleVenues = (scheduleData as { venues: Record<string, ScheduleVenueCatalogEntry> }).venues;

function formatDisplaySecondary(venue: VenueEnrichment): string {
  if (venue.state) return `${venue.hostCity} · ${venue.state}`;
  return venue.hostCity;
}

function mergeWithScheduleCatalog(stadiumName: string, base: VenueEnrichment): VenueEnrichment {
  const catalog = scheduleVenues[stadiumName];
  if (!catalog) return base;

  return {
    ...base,
    city: base.city || catalog.city,
    state: base.state ?? catalog.state ?? undefined,
    country: base.country || catalog.country,
    fifaOfficialName: base.fifaOfficialName || catalog.fifaName,
    capacity: base.capacity ?? catalog.capacity,
    timezone: base.timezone || catalog.tz
  };
}

function mergeWithKnockout(stadiumName: string, base: VenueEnrichment): VenueEnrichment {
  const koEntry = Object.values(knockoutSchedule).find(
    (info) => normalizeStadiumName(info.stadium) === stadiumName
  );
  if (!koEntry) return base;

  return {
    ...base,
    hostCity: base.hostCity || koEntry.hostCity,
    city: base.city || koEntry.venueCity,
    country: base.country || koEntry.country
  };
}

function mergeWithCoordinates(stadiumName: string, base: VenueEnrichment): VenueEnrichment {
  const coords = getVenueCoords(stadiumName);
  if (!coords) return base;
  return {
    ...base,
    coordinates: base.coordinates ?? { lat: coords.lat, lon: coords.lon },
    city: base.city || coords.city
  };
}

function mergeWithPaninarrImages(venue: VenueEnrichment): VenueEnrichment {
  const paninarr = getPaninarrVenueImages(venue.slug);
  if (!paninarr) return venue;
  return {
    ...venue,
    heroImageUrl: paninarr.heroImageUrl ?? venue.heroImageUrl,
    cityHeroImageUrl: paninarr.cityHeroImageUrl ?? venue.cityHeroImageUrl,
    heroImageCredit: paninarr.heroImageCredit ?? venue.heroImageCredit,
  };
}

function mergeWithFifaSupplement(stadiumName: string, base: VenueEnrichment): VenueEnrichment {
  const fifa = getFifaVenueSupplement(stadiumName);
  if (!fifa) return base;
  return {
    ...base,
    fifaOfficialName: base.fifaOfficialName || fifa.fifaOfficialName,
    capacity: base.capacity ?? fifa.capacity,
    city: base.city || fifa.city,
  };
}

function toResolved(venue: VenueEnrichment): ResolvedVenue {
  const merged = mergeWithPaninarrImages(
    mergeWithCoordinates(
      venue.stadiumName,
      mergeWithFifaSupplement(
        venue.stadiumName,
        mergeWithKnockout(venue.stadiumName, mergeWithScheduleCatalog(venue.stadiumName, venue))
      )
    )
  );
  return {
    ...merged,
    displayPrimary: merged.stadiumName,
    displaySecondary: formatDisplaySecondary(merged)
  };
}

export function resolveVenueBySlug(slug: string): ResolvedVenue | null {
  const enrichment = getVenueBySlug(slug);
  if (!enrichment) return null;
  return toResolved(enrichment);
}

export function resolveVenueByStadiumName(stadiumName: string): ResolvedVenue | null {
  const canonical = normalizeStadiumName(stadiumName);
  const enrichment = getVenueByStadiumName(canonical) ?? getVenueByStadiumName(stadiumName);
  if (!enrichment) return null;
  return toResolved(enrichment);
}

export function resolveVenueByMatchId(matchId: string): ResolvedVenue | null {
  const broadcast = getBroadcast(matchId);
  if (!broadcast?.venue.name) return null;

  const fromStadium = resolveVenueByStadiumName(broadcast.venue.name);
  if (fromStadium) return fromStadium;

  const ko = knockoutSchedule[matchId];
  if (ko) return resolveVenueByStadiumName(ko.stadium);

  return null;
}

export function resolveVenueFromMatch(
  matchId: string | undefined,
  venueString: string | undefined
): ResolvedVenue | null {
  if (matchId) {
    const byId = resolveVenueByMatchId(matchId);
    if (byId) return byId;
  }

  if (venueString) {
    const stadiumPart = venueString.split(",")[0]?.trim();
    if (stadiumPart) {
      const byStadium = resolveVenueByStadiumName(stadiumPart);
      if (byStadium) return byStadium;
    }
  }

  return null;
}

export function listAllVenueSlugs(): string[] {
  return Object.keys(venuesBySlug);
}
