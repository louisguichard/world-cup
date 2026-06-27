/** Stable ids for per-module refresh + freshness tracking. */
export const MODULE_IDS = {
  liveMatches: "live-matches",
  groupStandings: "group-standings",
  bestThird: "best-third",
  recentResults: "recent-results",
  qualification: "qualification",
  bracket: "bracket",
  schedule: "schedule",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];
