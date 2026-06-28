import type { MergedMatch } from "../../types";
import type { HighlightlyMatchIntro } from "../../types/sportHighlights";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { Team } from "../../types";
import {
  buildHighlightAttribution,
  pickIntroHighlight,
  readHighlightIntro,
  writeHighlightIntro,
} from "../../lib/highlightlyStaticCache";
import { canSpendHighlightlyRequests } from "../../lib/highlightlyQuota";
import {
  fetchHighlightlyHighlights,
  isSportHighlightsDisabled,
  resolveHighlightlyMatchId,
} from "../SportHighlightsClient";
import { logger } from "../Logger";

/** Minimum API calls to resolve match id + highlights for a finished fixture. */
const INTRO_REQUEST_BUDGET = 2;

/**
 * Fetch post-match highlight intro — only for completed fixtures.
 * Results are stored permanently (static) to conserve the 100 req/month quota.
 */
export async function fetchHighlightIntroForMatch(input: {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  force?: boolean;
}): Promise<HighlightlyMatchIntro> {
  const { match, homeTeam, awayTeam, force = false } = input;
  const cached = readHighlightIntro(match.id);
  if (cached && !force) return cached;

  const emptyBase = (status: HighlightlyMatchIntro["status"]): HighlightlyMatchIntro => ({
    matchId: match.id,
    highlightlyMatchId: null,
    highlights: [],
    introHighlight: null,
    fetchedAt: new Date().toISOString(),
    source: "football-highlights-api",
    requestsUsed: 0,
    attribution: buildHighlightAttribution(new Date().toISOString(), 0),
    status,
  });

  if (match.status !== "completed") {
    return cached ?? { ...emptyBase("empty"), attribution: "Highlights load after the final whistle." };
  }

  if (isSportHighlightsDisabled()) {
    return cached ?? emptyBase("error");
  }

  if (!canSpendHighlightlyRequests(INTRO_REQUEST_BUDGET)) {
    const blocked = emptyBase("quota_exceeded");
    blocked.attribution = "Monthly Highlightly quota reached — cached clips still available.";
    return cached ?? blocked;
  }

  const homeName = teamDisplayName(homeTeam, match.homeTeamId);
  const awayName = teamDisplayName(awayTeam, match.awayTeamId);
  let requestsUsed = 0;

  const highlightlyMatchId = await resolveHighlightlyMatchId({
    homeTeamName: homeName,
    awayTeamName: awayName,
    date: match.date,
  });
  requestsUsed += 1;

  if (!highlightlyMatchId) {
    const miss = emptyBase("empty");
    miss.attribution = "No Highlightly match id found for this fixture.";
    writeHighlightIntro(miss);
    return miss;
  }

  const highlights = await fetchHighlightlyHighlights({
    matchId: highlightlyMatchId,
    limit: 10,
  });
  requestsUsed += 1;

  const introHighlight = pickIntroHighlight(highlights);
  const fetchedAt = new Date().toISOString();
  const intro: HighlightlyMatchIntro = {
    matchId: match.id,
    highlightlyMatchId,
    highlights,
    introHighlight,
    fetchedAt,
    source: "football-highlights-api",
    requestsUsed,
    attribution: buildHighlightAttribution(fetchedAt, highlights.length),
    status: highlights.length > 0 ? "available" : "empty",
  };

  writeHighlightIntro(intro);
  logger.info("Highlight intro cached", "fetchHighlightIntroForMatch", {
    matchId: match.id,
    clips: highlights.length,
    requestsUsed,
  });

  return intro;
}
