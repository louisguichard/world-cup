import { describe, expect, it } from "vitest";
import { EXPECTED_VENUE_COUNT, VENUE_ENRICHMENTS } from "../../data/venues/venueIndex";
import { normalizeStadiumName } from "../../data/venues/venueAliases";
import {
  listAllVenueSlugs,
  resolveVenueByMatchId,
  resolveVenueBySlug,
  resolveVenueByStadiumName
} from "./resolveVenue";

describe("resolveVenue", () => {
  it("indexes exactly 16 host-city venues", () => {
    expect(VENUE_ENRICHMENTS).toHaveLength(EXPECTED_VENUE_COUNT);
    expect(listAllVenueSlugs()).toHaveLength(EXPECTED_VENUE_COUNT);
  });

  it("resolves M1 group match by matchId", () => {
    const venue = resolveVenueByMatchId("M1");
    expect(venue).not.toBeNull();
    expect(venue?.stadiumName).toBeTruthy();
    expect(venue?.displayPrimary).toBe(venue?.stadiumName);
  });

  it("resolves M73 knockout match", () => {
    const venue = resolveVenueByMatchId("M73");
    expect(venue?.stadiumName).toBe("SoFi Stadium");
    expect(venue?.hostCity).toBe("Los Angeles");
    expect(venue?.city).toBe("Inglewood");
  });

  it("normalizes Estadio Banorte alias to Estadio Azteca", () => {
    const venue = resolveVenueByStadiumName("Estadio Banorte");
    expect(venue?.stadiumName).toBe("Estadio Azteca");
    expect(venue?.slug).toBe("mexico-city");
  });

  it("enrichment fills county when schedule lacks it", () => {
    const venue = resolveVenueBySlug("los-angeles");
    expect(venue?.county).toBe("Los Angeles County");
    expect(venue?.stadiumLocation).toContain("Stadium Dr");
  });

  it("falls back to coordinates for lat/lon", () => {
    const venue = resolveVenueBySlug("seattle");
    expect(venue?.coordinates?.lat).toBeCloseTo(47.595, 2);
    expect(venue?.coordinates?.lon).toBeCloseTo(-122.332, 2);
  });

  it("returns null for unknown slug", () => {
    expect(resolveVenueBySlug("unknown-city")).toBeNull();
  });

  it("normalizeStadiumName maps GEHA Field alias", () => {
    expect(normalizeStadiumName("GEHA Field at Arrowhead Stadium")).toBe("Arrowhead Stadium");
  });

  it("resolves all 16 host-city slugs", () => {
    for (const slug of listAllVenueSlugs()) {
      const venue = resolveVenueBySlug(slug);
      expect(venue, slug).not.toBeNull();
      expect(venue?.slug).toBe(slug);
      expect(venue?.stadiumName).toBeTruthy();
      expect(venue?.county).toBeTruthy();
    }
  });
});
