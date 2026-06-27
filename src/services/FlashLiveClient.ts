import { isApiEnabled } from "../config/apiFlags";
import type { ApiRequestIntent } from "../config/apiQuotaPolicy";
import {
  FLASHLIVE_DEFAULT_LOCALE,
  FLASHLIVE_HOST,
  FLASHLIVE_SAMPLE_EVENT_ID,
  FLASHLIVE_SAMPLE_TEAM_ID,
  FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID,
  FLASHLIVE_SOCCER_SPORT_ID,
  flashliveEndpoints,
  type FlashLiveLocale,
} from "../config/flashliveEndpoints";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import type { FlashLiveEnvelope, FlashLiveSport, FlashLiveTeamTransfersPage } from "../types/flashlive";
import { acquireApiQuota, logApiQuotaBlock } from "./ApiQuotaGovernor";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isFlashLiveDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("flashLive");
}

export function resetFlashLiveSessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${FLASHLIVE_HOST}`;
  return "/api/flashlive";
}

function headers(): HeadersInit {
  return rapidApiHeaders(providerByHost(FLASHLIVE_HOST)?.host ?? FLASHLIVE_HOST);
}

function unwrapData<T>(raw: unknown): T | null {
  if (raw == null || typeof raw !== "object") return null;
  const envelope = raw as FlashLiveEnvelope<T>;
  if ("DATA" in envelope) return envelope.DATA;
  return raw as T;
}

async function fetchJson<T = unknown>(
  path: string,
  context: string,
  intent: ApiRequestIntent = "background"
): Promise<T | null> {
  if (isFlashLiveDisabled()) return null;

  const quota = acquireApiQuota("flashLive", intent);
  if (!quota.allowed) {
    logApiQuotaBlock("flashLive", intent, quota);
    return null;
  }

  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (res.status === 429) sessionDisabled = true;
      logger.warn(`FlashLive ${context} blocked`, "FlashLiveClient", { status: res.status, path });
      return null;
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.warn(`FlashLive ${context} failed`, "FlashLiveClient", { status: res.status, path });
      return null;
    }
    const raw: unknown = await res.json();
    return unwrapData<T>(raw) ?? (raw as T);
  } catch (error) {
    logger.warn(`FlashLive ${context} error`, "FlashLiveClient", {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Connection probe — sports catalog is lightweight. */
export async function fetchFlashLiveConnectionTest(): Promise<boolean> {
  const sports = await fetchSportsList("test");
  return sports != null && sports.length > 0;
}

export async function fetchSportsList(intent: ApiRequestIntent = "background"): Promise<FlashLiveSport[] | null> {
  const data = await fetchJson<FlashLiveSport[]>(flashliveEndpoints.sportsList(), "sports-list", intent);
  return data ?? null;
}

export async function fetchMultiSearch(
  query: string,
  opts?: { sport_id?: number; locale?: FlashLiveLocale }
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.multiSearch({ query, ...opts }), "multi-search");
}

export async function fetchRankingsFifa(locale?: FlashLiveLocale): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.rankingsFifa({ locale }), "rankings-fifa");
}

export async function fetchRankingsUefa(locale?: FlashLiveLocale): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.rankingsUefa({ locale }), "rankings-uefa");
}

export async function fetchEventsList(opts?: {
  sport_id?: number;
  indent_days?: number;
  locale?: FlashLiveLocale;
  timezone?: number;
}): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventsList(opts ?? {}), "events-list");
}

export async function fetchEventsChanges(opts?: {
  sport_id?: number;
  locale?: FlashLiveLocale;
}): Promise<unknown | null> {
  return fetchJson(
    flashliveEndpoints.eventsChanges({ sport_id: opts?.sport_id ?? FLASHLIVE_SOCCER_SPORT_ID, ...opts }),
    "events-changes"
  );
}

export async function fetchEventData(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventData(eventId, locale), "event-data");
}

export async function fetchEventDetails(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventDetails(eventId, locale), "event-details");
}

export async function fetchEventStatistics(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventStatistics(eventId, locale), "event-statistics");
}

export async function fetchEventLineups(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventLineups(eventId, locale), "event-lineups");
}

export async function fetchEventCommentary(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventCommentary(eventId, locale), "event-commentary");
}

export async function fetchEventOdds(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventOdds(eventId, locale), "event-odds");
}

export async function fetchEventLastChange(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventLastChange(eventId, locale), "event-last-change");
}

export async function fetchEventSummaryIncidents(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventSummaryIncidents(eventId, locale), "event-summary-incidents");
}

export async function fetchEventMissingPlayers(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventMissingPlayers(eventId, locale), "event-missing-players");
}

export async function fetchEventHeadToHead(
  eventId: string = FLASHLIVE_SAMPLE_EVENT_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.eventHeadToHead(eventId, locale), "event-head-to-head");
}

export async function fetchTournamentResults(opts?: {
  tournament_stage_id?: string;
  page?: number;
  locale?: FlashLiveLocale;
}): Promise<unknown | null> {
  return fetchJson(
    flashliveEndpoints.tournamentResults({
      tournament_stage_id: opts?.tournament_stage_id ?? FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID,
      page: opts?.page,
      locale: opts?.locale,
    }),
    "tournament-results"
  );
}

export async function fetchTournamentFixtures(opts?: {
  tournament_stage_id?: string;
  page?: number;
  locale?: FlashLiveLocale;
}): Promise<unknown | null> {
  return fetchJson(
    flashliveEndpoints.tournamentFixtures({
      tournament_stage_id: opts?.tournament_stage_id ?? FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID,
      page: opts?.page,
      locale: opts?.locale,
    }),
    "tournament-fixtures"
  );
}

export async function fetchTournamentStandings(
  tournamentStageId: string = FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(
    flashliveEndpoints.tournamentStandings({ tournament_stage_id: tournamentStageId, locale }),
    "tournament-standings"
  );
}

export async function fetchTournamentTopScorers(
  tournamentStageId: string = FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(
    flashliveEndpoints.tournamentTopScorers({ tournament_stage_id: tournamentStageId, locale }),
    "tournament-top-scorers"
  );
}

export async function fetchTeamData(
  teamId: string = FLASHLIVE_SAMPLE_TEAM_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.teamData(teamId, locale), "team-data");
}

export async function fetchTeamSquad(
  teamId: string = FLASHLIVE_SAMPLE_TEAM_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.teamSquad(teamId, locale), "team-squad");
}

export async function fetchTeamTransfers(opts: {
  team_id: string;
  page?: number;
  locale?: FlashLiveLocale;
}): Promise<FlashLiveTeamTransfersPage | null> {
  return fetchJson<FlashLiveTeamTransfersPage>(
    flashliveEndpoints.teamTransfers({
      team_id: opts.team_id,
      page: opts.page ?? 1,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    }),
    "team-transfers"
  );
}

export async function fetchTeamLastEvents(
  teamId: string = FLASHLIVE_SAMPLE_TEAM_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.teamLastEvents(teamId, locale), "team-last-events");
}

export async function fetchTeamNextEvents(
  teamId: string = FLASHLIVE_SAMPLE_TEAM_ID,
  locale?: FlashLiveLocale
): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.teamNextEvents(teamId, locale), "team-next-events");
}

export async function fetchPlayerData(playerId: string, locale?: FlashLiveLocale): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.playerData(playerId, locale), "player-data");
}

export async function fetchPlayerCareer(playerId: string, locale?: FlashLiveLocale): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.playerCareer(playerId, locale), "player-career");
}

export async function fetchNewsList(opts?: { locale?: FlashLiveLocale; page?: number }): Promise<unknown | null> {
  return fetchJson(flashliveEndpoints.newsList(opts), "news-list");
}

/** Resolve FlashLive team id by name via multi-search (soccer). */
export async function resolveFlashLiveTeamId(teamName: string): Promise<string | null> {
  const raw = await fetchMultiSearch(teamName, { sport_id: FLASHLIVE_SOCCER_SPORT_ID });
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { TEAMS?: Array<{ TEAM_ID?: string; TEAM_NAME?: string }> };
  const teams = data.TEAMS ?? [];
  const needle = teamName.trim().toLowerCase();
  const exact = teams.find((t) => t.TEAM_NAME?.trim().toLowerCase() === needle);
  if (exact?.TEAM_ID) return exact.TEAM_ID;
  return teams[0]?.TEAM_ID ?? null;
}
