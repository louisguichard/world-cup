export const WC_LIVE_HOST = "world-cup-2026-live-api.p.rapidapi.com";

export const wcLiveEndpoints = {
  draw: (stage: "group" | "ko" = "group") => `/wc/draw?stage=${stage}`,
  live: () => "/wc/live",
  standings: () => "/wc/standings",
  matchDetail: (matchId: string) => `/wc/match/${encodeURIComponent(matchId)}/detail`,
  matchCommentary: (matchId: string) => `/wc/match/${encodeURIComponent(matchId)}/commentary`,
  matchLineups: (matchId: string) => `/wc/match/${encodeURIComponent(matchId)}/lineups`,
  matchStats: (matchId: string) => `/wc/match/${encodeURIComponent(matchId)}/stats`,
} as const;
