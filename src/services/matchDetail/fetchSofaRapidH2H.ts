import {
  fetchMatchH2hEventsRaw,
  fetchMatchH2hRaw,
  normalizeTeamDuel,
} from "../SofaScoreRapidClient";
import { getCachedSofaH2h, upsertSofaH2h, type SofaH2hCacheEntry } from "../../lib/sofaMatchH2hCache";
import { normalizeSofaRapidH2hEvents } from "../teamProfile/normalizeSofaRapidTeamProfile";
import { isProfileStale } from "../../lib/teamProfileCache";

export async function fetchSofaRapidH2H(sofaEventId: string): Promise<SofaH2hCacheEntry | null> {
  const cached = getCachedSofaH2h(sofaEventId);
  if (cached && !isProfileStale(cached.fetchedAt)) return cached;

  const [duelRaw, eventsRaw] = await Promise.all([
    fetchMatchH2hRaw(sofaEventId),
    fetchMatchH2hEventsRaw(sofaEventId),
  ]);

  const duel = normalizeTeamDuel(duelRaw);
  if (!duel && !eventsRaw) return cached;

  const events = normalizeSofaRapidH2hEvents(eventsRaw).map((e) => ({
    id: e.id,
    date: e.date,
    homeTeam: e.homeTeam,
    awayTeam: e.awayTeam,
    homeScore: e.homeScore,
    awayScore: e.awayScore,
    tournament: e.tournament,
  }));

  const entry: SofaH2hCacheEntry = {
    matchId: sofaEventId,
    fetchedAt: new Date().toISOString(),
    homeWins: duel?.homeWins ?? 0,
    awayWins: duel?.awayWins ?? 0,
    draws: duel?.draws ?? 0,
    events,
  };

  upsertSofaH2h(entry);
  return entry;
}
