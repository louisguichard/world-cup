import type { MergedMatch } from "../../types";

export type VenueEnrichment = {
  slug: string;
  hostCity: string;
  stadiumName: string;
  stadiumLocation?: string;
  city: string;
  state?: string;
  county?: string;
  country: string;
  fifaOfficialName: string;
  formerStadiumName?: string;
  capacity?: number;
  timezone: string;
  coordinates?: { lat: number; lon: number };
  aliases?: string[];
};

export type ResolvedVenue = VenueEnrichment & {
  displayPrimary: string;
  displaySecondary: string;
};

export type VenueMatchSlice = {
  recent: MergedMatch | null;
  upcoming: MergedMatch | null;
  timeline: MergedMatch[];
  past: MergedMatch[];
  future: MergedMatch[];
};
