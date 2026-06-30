import type { FifaVenueSupplement } from "../../services/adapters/normalizeFifaPublicStadium";

const supplementsByStadiumName = new Map<string, FifaVenueSupplement>();
const supplementsByFifaId = new Map<string, FifaVenueSupplement>();

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Registers FIFA stadium supplements from the HTTP service. */
export function setFifaVenueSupplements(
  entries: Array<FifaVenueSupplement & { idStadium: string }>
): void {
  supplementsByStadiumName.clear();
  supplementsByFifaId.clear();
  for (const entry of entries) {
    if (entry.stadiumName) {
      supplementsByStadiumName.set(normalizeKey(entry.stadiumName), entry);
    }
    supplementsByFifaId.set(entry.idStadium, entry);
  }
}

/** Looks up FIFA venue supplement by stadium display name. */
export function getFifaVenueSupplement(stadiumName: string): FifaVenueSupplement | undefined {
  return supplementsByStadiumName.get(normalizeKey(stadiumName));
}
