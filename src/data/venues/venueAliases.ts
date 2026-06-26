/** Normalize stadium names that differ across schedule sources. */
export const VENUE_STADIUM_ALIASES: Record<string, string> = {
  "Estadio Banorte": "Estadio Azteca",
  "GEHA Field at Arrowhead Stadium": "Arrowhead Stadium"
};

export function normalizeStadiumName(name: string): string {
  return VENUE_STADIUM_ALIASES[name] ?? name;
}
