import { isApiEnabled } from "../config/apiFlags";
import { setFifaVenueSupplements } from "../lib/venue/fifaVenueSupplement";
import { normalizeFifaPublicStadium } from "./adapters/normalizeFifaPublicStadium";
import { normalizeFifaPublicTeam } from "./adapters/normalizeFifaPublicTeam";
import { mergeTeamPartials } from "./adapters/normalizeTeam";
import {
  fetchWc2026Matches,
  fetchWc2026Stadiums,
  fetchWc2026Teams,
  isFifaPublicDisabled,
} from "./FifaPublicClient";
import { mergeFifaPublicMatchesIntoStore } from "./fifaPublicMatchMerge";
import { logger } from "./Logger";
import type { MergedMatch, Team } from "../types";

/** Deferred boot enrichment from the local FIFA public HTTP service. */
export async function enrichFromFifaPublicApi(
  teams: Record<string, Team>,
  matches: Record<string, MergedMatch>
): Promise<{ teams: Record<string, Team>; matches: Record<string, MergedMatch>; mergedCount: number }> {
  if (!isApiEnabled("fifaPublicApi") || isFifaPublicDisabled()) {
    return { teams, matches, mergedCount: 0 };
  }

  let nextTeams = { ...teams };
  const nextMatches = { ...matches };
  let mergedCount = 0;

  try {
    const [fifaMatches, fifaTeams, fifaStadiums] = await Promise.all([
      fetchWc2026Matches(),
      fetchWc2026Teams(),
      fetchWc2026Stadiums(),
    ]);

    mergedCount = mergeFifaPublicMatchesIntoStore(nextMatches, fifaMatches);

    for (const raw of fifaTeams) {
      const partial = normalizeFifaPublicTeam(raw);
      const abbrev = partial.abbreviation?.toUpperCase();
      const byAbbrev = abbrev
        ? Object.values(nextTeams).find((t) => t.abbreviation.toUpperCase() === abbrev)
        : undefined;
      const byName = partial.name
        ? Object.values(nextTeams).find(
            (t) => t.name.toLowerCase() === partial.name!.toLowerCase()
          )
        : undefined;
      const existing = byAbbrev ?? byName;
      if (!existing) continue;
      const merged = mergeTeamPartials(existing, partial);
      nextTeams[existing.id] = { ...existing, ...merged, rating: existing.rating };
    }

    if (fifaStadiums.length > 0) {
      setFifaVenueSupplements(fifaStadiums.map((s) => normalizeFifaPublicStadium(s)));
    }

    logger.info("FIFA public API enrichment complete", "enrichFromFifaPublicApi", {
      matches: fifaMatches.length,
      mergedCount,
      teams: fifaTeams.length,
      stadiums: fifaStadiums.length,
    });
  } catch (error) {
    logger.warn("FIFA public API enrichment skipped", "enrichFromFifaPublicApi", {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  return { teams: nextTeams, matches: nextMatches, mergedCount };
}
