import type { Team } from "../../types";
import type { FifaPublicTeam } from "../../schemas/fifaPublic";
import { resolveCatalogTeamIdByName } from "../../data/wc2026TeamCatalog";

/** Maps FIFA public API team row to partial Team fields. */
export function normalizeFifaPublicTeam(raw: FifaPublicTeam): Partial<Team> {
  const partial: Partial<Team> = {};

  const name = raw.name?.trim();
  if (name) {
    partial.name = name;
    partial.shortName = name;
    const catalogId = resolveCatalogTeamIdByName(name);
    if (catalogId) partial.id = catalogId;
  }

  if (raw.abbreviation?.trim()) {
    partial.abbreviation = raw.abbreviation.trim().toUpperCase();
  }

  if (raw.pictureUrl?.trim()) partial.logo = raw.pictureUrl.trim();
  if (raw.idTeam) partial.wc2026TeamId = raw.idTeam;

  return partial;
}
