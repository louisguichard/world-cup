export const WORLD_CUP_HISTORY_HOST = "world-cup1.p.rapidapi.com";

/** RapidAPI World Cup1 history endpoints (1930–2018). Trailing slashes match upstream Django-style routes. */
export const worldCupHistoryEndpoints = {
  winners: () => "/winners/",
  winnersByYear: (year: number) => `/winners_by_year/?year=${year}`,
  worldCupsDetails: () => "/world_cups_details/",
  worldCupDetailByYear: (year: number) => `/world_cup_detail_by_year/?year=${year}`,
  goldenBall: () => "/golden_ball/",
  goldenBoot: () => "/golden_boot/",
  bestYoungPlayer: () => "/best_young_player/",
  goldenGlove: () => "/golden_glove/",
} as const;

export type WorldCupHistoryEndpointId = keyof typeof worldCupHistoryEndpoints;

export const WORLD_CUP_HISTORY_DAILY_ENDPOINTS: WorldCupHistoryEndpointId[] = [
  "winners",
  "worldCupsDetails",
  "goldenBall",
  "goldenBoot",
  "bestYoungPlayer",
  "goldenGlove",
];
