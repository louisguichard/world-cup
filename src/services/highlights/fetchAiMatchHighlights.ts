import type { MatchEvent, MergedMatch, Team } from "../../types";
import type { AiMatchHighlightsIntro } from "../../types/aiSportsHighlights";
import {
  buildAiHighlightAttribution,
  readAiHighlightIntro,
  writeAiHighlightIntro,
} from "../../lib/aiHighlightsStaticCache";
import { generateAiSportsHighlights, isAiSportsHighlightsDisabled } from "../AiSportsHighlightsClient";
import { buildAiHighlightRequest } from "./buildAiHighlightRequest";
import { logger } from "../Logger";

/**
 * Fetch AI-generated match recap — only for completed fixtures.
 * Results are cached permanently to avoid repeat generation calls.
 */
export async function fetchAiMatchHighlights(input: {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  events?: MatchEvent[];
  force?: boolean;
}): Promise<AiMatchHighlightsIntro> {
  const { match, homeTeam, awayTeam, events, force = false } = input;
  const cached = readAiHighlightIntro(match.id);
  if (cached && !force) return cached;

  const request = buildAiHighlightRequest({ match, homeTeam, awayTeam, events });
  const emptyBase = (status: AiMatchHighlightsIntro["status"]): AiMatchHighlightsIntro => ({
    matchId: match.id,
    request,
    response: null,
    result: null,
    fetchedAt: new Date().toISOString(),
    source: "ai-sports-highlights-api",
    attribution: buildAiHighlightAttribution(new Date().toISOString()),
    status,
  });

  if (match.status !== "completed") {
    return (
      cached ?? {
        ...emptyBase("pending"),
        attribution: "AI recap generates after the final whistle.",
      }
    );
  }

  if (isAiSportsHighlightsDisabled()) {
    return cached ?? emptyBase("error");
  }

  const response = await generateAiSportsHighlights(request, { noqueue: true });
  const fetchedAt = new Date().toISOString();

  if (!response?.result) {
    const miss = emptyBase("empty");
    miss.response = response;
    miss.attribution = response?.message ?? "AI highlights could not be generated for this match.";
    writeAiHighlightIntro(miss);
    return miss;
  }

  const intro: AiMatchHighlightsIntro = {
    matchId: match.id,
    request,
    response,
    result: response.result,
    fetchedAt,
    source: "ai-sports-highlights-api",
    attribution: buildAiHighlightAttribution(fetchedAt),
    status: "available",
  };

  writeAiHighlightIntro(intro);
  logger.info("AI match highlights cached", "fetchAiMatchHighlights", {
    matchId: match.id,
    title: intro.result?.title,
  });

  return intro;
}
