import type { FifaPublicStadium } from "../../schemas/fifaPublic";
import type { VenueEnrichment } from "../../lib/venue/types";

export type FifaVenueSupplement = Pick<
  VenueEnrichment,
  "fifaOfficialName" | "capacity" | "city" | "stadiumName"
>;

/** Maps FIFA stadium row to venue supplement fields keyed by FIFA stadium name. */
export function normalizeFifaPublicStadium(raw: FifaPublicStadium): FifaVenueSupplement & { idStadium: string } {
  const name = raw.name?.trim() ?? "";
  return {
    idStadium: raw.idStadium,
    stadiumName: name,
    fifaOfficialName: name,
    city: raw.city?.trim() ?? "",
    capacity: raw.capacity ?? undefined,
  };
}
