import type { VenueEnrichment } from "../../lib/venue/types";
import atlanta from "./enrichment/atlanta.json";
import boston from "./enrichment/boston.json";
import dallas from "./enrichment/dallas.json";
import guadalajara from "./enrichment/guadalajara.json";
import houston from "./enrichment/houston.json";
import kansasCity from "./enrichment/kansas-city.json";
import losAngeles from "./enrichment/los-angeles.json";
import mexicoCity from "./enrichment/mexico-city.json";
import miami from "./enrichment/miami.json";
import monterrey from "./enrichment/monterrey.json";
import newYorkNewJersey from "./enrichment/new-york-new-jersey.json";
import philadelphia from "./enrichment/philadelphia.json";
import sanFranciscoBayArea from "./enrichment/san-francisco-bay-area.json";
import seattle from "./enrichment/seattle.json";
import toronto from "./enrichment/toronto.json";
import vancouver from "./enrichment/vancouver.json";

export const VENUE_ENRICHMENTS: VenueEnrichment[] = [
  atlanta as VenueEnrichment,
  boston as VenueEnrichment,
  dallas as VenueEnrichment,
  guadalajara as VenueEnrichment,
  houston as VenueEnrichment,
  kansasCity as VenueEnrichment,
  losAngeles as VenueEnrichment,
  mexicoCity as VenueEnrichment,
  miami as VenueEnrichment,
  monterrey as VenueEnrichment,
  newYorkNewJersey as VenueEnrichment,
  philadelphia as VenueEnrichment,
  sanFranciscoBayArea as VenueEnrichment,
  seattle as VenueEnrichment,
  toronto as VenueEnrichment,
  vancouver as VenueEnrichment
];

export const EXPECTED_VENUE_COUNT = 16;

export const venuesBySlug: Record<string, VenueEnrichment> = Object.fromEntries(
  VENUE_ENRICHMENTS.map((v) => [v.slug, v])
);

export const venuesByStadiumName: Record<string, VenueEnrichment> = Object.fromEntries(
  VENUE_ENRICHMENTS.flatMap((v) => {
    const keys = [v.stadiumName, ...(v.aliases ?? [])];
    return keys.map((key) => [key, v]);
  })
);

export const venuesByHostCity: Record<string, VenueEnrichment> = Object.fromEntries(
  VENUE_ENRICHMENTS.map((v) => [v.hostCity, v])
);

export function getVenueBySlug(slug: string): VenueEnrichment | undefined {
  return venuesBySlug[slug];
}

export function getVenueByStadiumName(stadiumName: string): VenueEnrichment | undefined {
  return venuesByStadiumName[stadiumName];
}
