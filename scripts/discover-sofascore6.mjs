#!/usr/bin/env node
/**
 * Probe sofascore6 RapidAPI paths. Usage: node scripts/discover-sofascore6.mjs
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const KEY = env.match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing in .env.local");
  process.exit(1);
}

const HOST = "sofascore6.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
};

async function probe(path) {
  const res = await fetch(`${BASE}${path}`, { headers: hdr });
  const text = await res.text();
  return { path, status: res.status, preview: text.slice(0, 140).replace(/\s+/g, " ") };
}

const liveRes = await fetch(`${BASE}/api/sofascore/v1/match/live?sport_slug=football`, { headers: hdr });
const liveJson = await liveRes.json();
const events = Array.isArray(liveJson) ? liveJson : (liveJson.events ?? []);
const id = events[0]?.id ?? 15186828;
console.log("live events:", events.length, "sample id:", id);

const candidates = [
  `/api/sofascore/v1/match/live?sport_slug=football`,
  `/api/sofascore/v1/match/get-live?sport_slug=football`,
  `/api/sofascore/v1/match/get-live-matches?sport_slug=football`,
  `/api/sofascore/v1/match/get-matches-by-date?sport_slug=football&date=2026-06-15`,
  `/api/sofascore/v1/match/get-matches-by-date?date=2026-06-15&sport_slug=football`,
  `/api/sofascore/v1/match/get-match-details?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-details?match_id=${id}`,
  `/api/sofascore/v1/match/get-match-details?id=${id}`,
  `/api/sofascore/v1/match/get-match-incidents?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-lineups?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-statistics?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-odds?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-comments?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-votes?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-best-players?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-shotmap?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-highlights?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-managers?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-pregame-form?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-player-average-positions?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-point-by-point?event_id=${id}`,
  `/api/sofascore/v1/match/get-match-official-tweets?event_id=${id}`,
  `/api/sofascore/v1/general/get-all-sports`,
  `/api/sofascore/v1/general/sports`,
  `/api/sofascore/v1/general/get-odds-providers`,
  `/api/sofascore/v1/category/get-all-categories`,
  `/api/sofascore/v1/category/get-category-unique-tournaments?category_id=1468`,
  `/api/sofascore/v1/historical-data/get-scheduled-ut-for-a-specific-date?date=2026-06-15`,
  `/api/sofascore/v1/historical-data/get-scheduled-matches-for-a-ut?unique_tournament_id=16&season_id=61627`,
  `/api/sofascore/v1/unique-tournament/get-ut-details?unique_tournament_id=16`,
  `/api/sofascore/v1/unique-tournament/get-ut-seasons?unique_tournament_id=16`,
  `/api/sofascore/v1/unique-tournament/get-ut-season-standings?unique_tournament_id=16&season_id=61627`,
  `/api/sofascore/v1/team/get-team-details?team_id=4748`,
  `/api/sofascore/v1/team/get-team-players?team_id=4748`,
  `/api/sofascore/v1/player/get-player-details?player_id=12994`,
  `/api/sofascore/v1/search/all?q=world+cup`,
  `/api/sofascore/v1/search/teams?q=brazil`,
  `/api/sofascore/v1/search/matches?q=brazil`,
  `/api/sofascore/v1/search/players?q=messi`,
  `/api/sofascore/v1/search/managers?q=scaloni`,
  `/api/sofascore/v1/search/referees?q=fifa`,
  `/api/sofascore/v1/search/venues?q=metlife`,
  `/api/sofascore/v1/search/unique-tournaments?q=world+cup`,
];

for (const path of candidates) {
  const r = await probe(path);
  if (r.status !== 404) {
    console.log(`${r.status}\t${r.path}\n\t${r.preview}`);
  }
}
