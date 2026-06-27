/**
 * FlashLive Sports API (RapidAPI) — v1 paths.
 * @see https://flashlive.rapi.one/rapid/Rapid_Quickstart
 * @see https://rapidapi.com/tipsters/api/flashlive-sports
 */

export const FLASHLIVE_HOST = "flashlive-sports.p.rapidapi.com";
export const FLASHLIVE_API_PREFIX = "/v1";

/** Default locale used across FlashLive examples and RapidAPI playground. */
export const FLASHLIVE_DEFAULT_LOCALE = "en_INT" as const;

export type FlashLiveLocale = typeof FLASHLIVE_DEFAULT_LOCALE | "en_GB" | "en_US";

/** Soccer — use {@link flashliveEndpoints.sportsList} for full catalog. */
export const FLASHLIVE_SOCCER_SPORT_ID = 1;

/** Sample ids from FlashLive docs / playground (for probes and dev). */
export const FLASHLIVE_SAMPLE_EVENT_ID = "6ivhWNOG";
export const FLASHLIVE_SAMPLE_TEAM_ID = "Wtn9Stg0";
export const FLASHLIVE_SAMPLE_TOURNAMENT_STAGE_ID = "OEEq9Yvp";

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const flashliveEndpoints = {
  // —— Sports ——
  sportsList: () => `${FLASHLIVE_API_PREFIX}/sports/list`,

  // —— Search ——
  multiSearch: (opts: { query: string; locale?: FlashLiveLocale; sport_id?: number }) =>
    `${FLASHLIVE_API_PREFIX}/search/multi-search${q({
      query: opts.query,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
      sport_id: opts.sport_id ?? FLASHLIVE_SOCCER_SPORT_ID,
    })}`,

  // —— Rankings ——
  rankingsFifa: (opts?: { locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/rankings/fifa${q({
      locale: opts?.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  rankingsUefa: (opts?: { locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/rankings/uefa-club${q({
      locale: opts?.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  // —— Events (schedule + live) ——
  eventsList: (opts: {
    sport_id?: number;
    indent_days?: number;
    locale?: FlashLiveLocale;
    timezone?: number;
  }) =>
    `${FLASHLIVE_API_PREFIX}/events/list${q({
      sport_id: opts.sport_id ?? FLASHLIVE_SOCCER_SPORT_ID,
      indent_days: opts.indent_days ?? 0,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
      timezone: opts.timezone ?? -4,
    })}`,

  eventsChanges: (opts: { sport_id?: number; locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/events/changes${q({
      sport_id: opts.sport_id ?? FLASHLIVE_SOCCER_SPORT_ID,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventData: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/data${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventDetails: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/details${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventStatistics: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/statistics${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventLineups: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/lineups${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventCommentary: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/commentary${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventOdds: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/odds${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventLastChange: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/last-change${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventSummaryIncidents: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/summary-incidents${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventMissingPlayers: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/missing-players${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventHeadToHead: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/head-to-head${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventPointByPoint: (eventId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/events/point-by-point${q({
      event_id: eventId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  eventRacingDetails: (opts: {
    tournament_template_id: string;
    sport_id: number;
    locale?: FlashLiveLocale;
    timezone?: number;
  }) =>
    `${FLASHLIVE_API_PREFIX}/events/racing-details${q({
      tournament_template_id: opts.tournament_template_id,
      sport_id: opts.sport_id,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
      timezone: opts.timezone ?? -4,
    })}`,

  // —— Tournaments ——
  tournamentResults: (opts: {
    tournament_stage_id: string;
    page?: number;
    locale?: FlashLiveLocale;
  }) =>
    `${FLASHLIVE_API_PREFIX}/tournaments/results${q({
      tournament_stage_id: opts.tournament_stage_id,
      page: opts.page ?? 1,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  tournamentFixtures: (opts: {
    tournament_stage_id: string;
    page?: number;
    locale?: FlashLiveLocale;
  }) =>
    `${FLASHLIVE_API_PREFIX}/tournaments/fixtures${q({
      tournament_stage_id: opts.tournament_stage_id,
      page: opts.page ?? 1,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  tournamentStandings: (opts: { tournament_stage_id: string; locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/tournaments/standings${q({
      tournament_stage_id: opts.tournament_stage_id,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  tournamentStages: (opts: {
    tournament_template_id: string;
    locale?: FlashLiveLocale;
    sport_id?: number;
  }) =>
    `${FLASHLIVE_API_PREFIX}/tournaments/stages${q({
      tournament_template_id: opts.tournament_template_id,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
      sport_id: opts.sport_id ?? FLASHLIVE_SOCCER_SPORT_ID,
    })}`,

  tournamentTopScorers: (opts: { tournament_stage_id: string; locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/tournaments/top-scorers${q({
      tournament_stage_id: opts.tournament_stage_id,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  // —— Teams ——
  teamData: (teamId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/teams/data${q({
      team_id: teamId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  teamSquad: (teamId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/teams/squad${q({
      team_id: teamId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  teamTransfers: (opts: { team_id: string; page?: number; locale?: FlashLiveLocale }) =>
    `${FLASHLIVE_API_PREFIX}/teams/transfers${q({
      team_id: opts.team_id,
      page: opts.page ?? 1,
      locale: opts.locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  teamLastEvents: (teamId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/teams/events/last${q({
      team_id: teamId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  teamNextEvents: (teamId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/teams/events/next${q({
      team_id: teamId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  teamImage: (teamId: string) =>
    `${FLASHLIVE_API_PREFIX}/teams/image${q({ team_id: teamId })}`,

  // —— Players ——
  playerData: (playerId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/players/data${q({
      player_id: playerId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  playerCareer: (playerId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/players/career${q({
      player_id: playerId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  playerTransfers: (playerId: string, locale?: FlashLiveLocale) =>
    `${FLASHLIVE_API_PREFIX}/players/transfers${q({
      player_id: playerId,
      locale: locale ?? FLASHLIVE_DEFAULT_LOCALE,
    })}`,

  playerImage: (playerId: string) =>
    `${FLASHLIVE_API_PREFIX}/players/image${q({ player_id: playerId })}`,

  // —— Images ——
  countryFlag: (countryId: string) =>
    `${FLASHLIVE_API_PREFIX}/images/country-flag${q({ country_id: countryId })}`,

  // —— News ——
  newsList: (opts?: { locale?: FlashLiveLocale; page?: number }) =>
    `${FLASHLIVE_API_PREFIX}/news/list${q({
      locale: opts?.locale ?? FLASHLIVE_DEFAULT_LOCALE,
      page: opts?.page ?? 1,
    })}`,
};
