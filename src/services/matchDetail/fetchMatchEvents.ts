import type { MatchEvent, MergedMatch } from "../../types";
import { isApiEnabled } from "../../config/apiFlags";
import { fetchMatchPlayByPlay } from "../ESPNClient";
import { fetchIncidents } from "../SofaScore6Client";
import { fetchCommentary, isWc2026LiveDisabled, type WcCommentaryEntry } from "../WorldCup2026LiveClient";
import { logger } from "../Logger";
import { useStore } from "../../store";
import { normalizeEventsForMatch } from "../../lib/resolveMatchEvents";
import { mapCommentaryToEvents } from "./mapCommentaryToEvents";
import { mapEspnPlayByPlayToEvents } from "./mapEspnToEvents";
import { mapIncidentsToEvents } from "./mapIncidentsToEvents";
import { normalizeProviderIncidents } from "./normalizeProviderIncidents";
import { resolveWcLiveApiMatchId } from "./resolveWcLiveMatchId";

function dedupeEvents(events: MatchEvent[]): MatchEvent[] {
  const seen = new Set<string>();
  const out: MatchEvent[] = [];
  for (const event of events) {
    const key = `${event.minute}-${event.minuteExtra ?? 0}-${event.type}-${event.teamId}-${event.playerName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }
  return out.sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));
}

/**
 * Fetches structured match events from the best available source:
 * SportAPI7 incidents → ESPN play-by-play → WC Live commentary parsing.
 */
export async function fetchMatchEvents(
  match: MergedMatch,
  wcMatchId: string | null,
  opts?: {
    commentary?: WcCommentaryEntry[];
    homeName?: string;
    awayName?: string;
  }
): Promise<MatchEvent[]> {
  const { homeTeamId, awayTeamId } = match;

  if (match.sofaEventId && (isApiEnabled("sofascore") || isApiEnabled("sportApi7"))) {
    try {
      const raw = await fetchIncidents(Number(match.sofaEventId));
      if (raw.length > 0) {
        const normalized = normalizeProviderIncidents(raw);
        const events = mapIncidentsToEvents(normalized, homeTeamId, awayTeamId);
        if (events.length > 0) return dedupeEvents(events);
      }
    } catch (error) {
      logger.warn("SofaScore6 incidents fetch failed", "fetchMatchEvents", {
        matchId: match.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (match.espnEventId && isApiEnabled("espnPlayByPlay")) {
    try {
      const pbp = await fetchMatchPlayByPlay(match.espnEventId);
      const events = mapEspnPlayByPlayToEvents(pbp, match.espnEventId, homeTeamId, awayTeamId);
      if (events.length > 0) return dedupeEvents(events);
    } catch (error) {
      logger.warn("ESPN play-by-play fetch failed", "fetchMatchEvents", {
        matchId: match.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  let commentary = opts?.commentary;
  if (!commentary?.length && isApiEnabled("wc2026Live") && !isWc2026LiveDisabled()) {
    const teams = useStore.getState().teams;
    const apiId = await resolveWcLiveApiMatchId(match, wcMatchId, teams);
    if (apiId) {
      commentary = (await fetchCommentary(apiId)) ?? [];
    }
  }

  if (commentary?.length) {
    const events = mapCommentaryToEvents(
      commentary,
      homeTeamId,
      awayTeamId,
      opts?.homeName ?? homeTeamId,
      opts?.awayName ?? awayTeamId
    );
    if (events.length > 0) return dedupeEvents(events);
  }

  return [];
}

/** Writes events to all known store keys for a match. */
export function publishMatchEvents(match: MergedMatch, events: MatchEvent[]): void {
  if (events.length === 0) return;
  const teams = useStore.getState().teams;
  const normalized = normalizeEventsForMatch(events, match, teams);
  const { mergeMatchEvents } = useStore.getState();
  mergeMatchEvents(match.id, normalized);
  if (match.matchId && match.matchId !== match.id) mergeMatchEvents(match.matchId, normalized);
  if (match.espnEventId) mergeMatchEvents(match.espnEventId, normalized);
}
