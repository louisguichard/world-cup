import type { MergedMatch, Team } from "../types";
import { isApiEnabled } from "../config/apiFlags";
import { enrichFromSofaScore } from "./DataMerger";
import { fetchScheduledToday as fetchFootballDataToday, isFootballDataDisabled } from "./FootballDataClient";
import { findEspnMatchForSofaEvent } from "./matchLinking";
import { fetchScheduledToday as fetchSportApiToday, isSportAPI7Disabled } from "./SportAPI7Client";
import { fetchScheduledToday as fetchSofaToday, isSofaScoreDisabled, type SofaEvent } from "./SofaScoreClient";

export type EnrichmentSource = "footballData" | "sportApi7" | "sofascore" | "none";

export async function fetchEnrichmentEvents(): Promise<{
  events: SofaEvent[];
  source: EnrichmentSource;
}> {
  const tryFootball = isApiEnabled("footballDataApi") && !isFootballDataDisabled();
  const trySofa = isApiEnabled("sofascore") && !isSofaScoreDisabled();
  const trySportApi = isApiEnabled("sportApi7") && !isSportAPI7Disabled();

  if (tryFootball) {
    const events = await fetchFootballDataToday();
    if (events.length > 0) return { events, source: "footballData" };
  }

  if (trySofa) {
    const events = await fetchSofaToday();
    if (events.length > 0) return { events, source: "sofascore" };
  }

  if (trySportApi) {
    const events = await fetchSportApiToday();
    if (events.length > 0) return { events, source: "sportApi7" };
  }

  return { events: [], source: "none" };
}

export function applyEnrichmentEvents(
  merged: Record<string, MergedMatch>,
  events: SofaEvent[],
  teams: Record<string, Team>
): number {
  let enrichedCount = 0;

  for (const ev of events) {
    const existing = findEspnMatchForSofaEvent(merged, ev, teams);
    if (!existing) continue;

    const sofaStatus = ev.status.type === "inprogress" ? ("live" as const) : undefined;
    const enriched = enrichFromSofaScore(existing, {
      sofaEventId: String(ev.id),
      homeScore: ev.homeScore?.current,
      awayScore: ev.awayScore?.current,
      displayClock: ev.status.description,
      ...(sofaStatus ? { status: sofaStatus } : {}),
    });

    if (enriched !== existing) {
      enrichedCount += 1;
    }
    merged[existing.id] = enriched;
  }

  return enrichedCount;
}

export function enrichmentSourceLabel(source: EnrichmentSource, enrichedCount: number): string {
  if (enrichedCount === 0 || source === "none") {
    return "[PollingEngine] Source: espn-primary";
  }
  return `[PollingEngine] Source: espn+${source}-enriched`;
}
