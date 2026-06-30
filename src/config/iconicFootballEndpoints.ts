/** IconicFootball-API (Laravel) — iconic player portraits + prime-era stats. */
export const ICONIC_FOOTBALL_API_BASE =
  import.meta.env.VITE_ICONIC_FOOTBALL_API_URL?.replace(/\/$/, "") ??
  "https://iconicfootball-api.fly.dev/api";

export const ICONIC_FOOTBALL_PLAYERS_URL = `${ICONIC_FOOTBALL_API_BASE}/players`;
