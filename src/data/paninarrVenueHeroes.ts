import venueHeroesBundled from "./generated/paninarrVenueHeroes.json";

type VenueHeroRecord = {
  heroImageUrl?: string;
  cityHeroImageUrl?: string;
  heroImageCredit?: string;
};

const venues = (venueHeroesBundled as { venues: Record<string, VenueHeroRecord> }).venues;

export function getPaninarrVenueImages(slug: string): VenueHeroRecord | undefined {
  return venues[slug];
}
