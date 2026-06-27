#!/usr/bin/env node
/**
 * Probes FIFA Football Data API (Creativesdev) endpoints.
 * Requires RAPIDAPI_KEY in .env.local and an active RapidAPI subscription.
 * Free tier: 10 requests per minute.
 */
import { readFileSync, existsSync } from "node:fs";

function loadKey() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const env = readFileSync(file, "utf8");
    const match = env.match(/^RAPIDAPI_KEY=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return process.env.RAPIDAPI_KEY?.trim();
}

const KEY = loadKey();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing — set in .env.local or environment");
  process.exit(1);
}

const HOST = "fifa-football-player-team-stats-records-matches-api-data.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "singleMatchVideo", path: "/fifa-single-match-video/v1/data?stage=285063&id=400128082" },
  { id: "singleMatch", path: "/fifa-single-match/v1/data?stage=285063&id=400128082" },
  { id: "matchEvents", path: "/fifa-match-events/v1/data?stage=285063&id=400128082" },
  { id: "matchStats", path: "/fifa-match-stats/v1/data?stage=285063&id=400128082" },
  { id: "lineups", path: "/fifa-lineups/v1/data?stage=285063&id=400128082" },
  { id: "teamMatchList", path: "/fifa-team-matchlist/v1/data?id=43922" },
  { id: "matchList", path: "/fifa-match-list/v1/data?stage=285063" },
  { id: "matchesList", path: "/fifa-matches-list/v1/data?stage=285063" },
  { id: "stageMatchList", path: "/fifa-stage-matchlist/v1/data?stage=285063" },
  { id: "tournamentMatchList", path: "/fifa-tournament-matchlist/v1/data?stage=285063" },
  { id: "worldCupMatchList", path: "/fifa-worldcup-matchlist/v1/data?stage=285063" },
  { id: "playerList", path: "/fifa-player-list/v1/data" },
  { id: "playersList", path: "/fifa-players-list/v1/data" },
  { id: "allPlayers", path: "/fifa-all-players/v1/data" },
  { id: "playerDetail", path: "/fifa-player-detail/v1/data?id=43922" },
  { id: "playerDetails", path: "/fifa-player-details/v1/data?id=43922" },
  { id: "playerImage", path: "/fifa-player-image/v1/data?id=43922" },
  { id: "playerStats", path: "/fifa-player-stats/v1/data?id=43922" },
  { id: "playerStatistics", path: "/fifa-player-statistics/v1/data?id=43922" },
  { id: "playerRecords", path: "/fifa-player-records/v1/data?id=43922" },
  { id: "teamList", path: "/fifa-team-list/v1/data" },
  { id: "teamsList", path: "/fifa-teams-list/v1/data" },
  { id: "allTeams", path: "/fifa-all-teams/v1/data" },
  { id: "teamDetail", path: "/fifa-team-detail/v1/data?id=43922" },
  { id: "teamDetails", path: "/fifa-team-details/v1/data?id=43922" },
  { id: "teamImage", path: "/fifa-team-image/v1/data?id=43922" },
  { id: "teamStats", path: "/fifa-team-stats/v1/data?id=43922" },
  { id: "teamStatistics", path: "/fifa-team-statistics/v1/data?id=43922" },
  { id: "teamRecords", path: "/fifa-team-records/v1/data?id=43922" },
];

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: hdr });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 160);
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`FIFA Football Data API — ${HOST}\n`);
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const { status, json } = await get(endpoint.path);
    const ok = status === 200;
    const detail = ok ? "ok" : json?.message ?? status;
    console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
    if (!ok && status !== 403 && status !== 404 && status !== 429) failed += 1;
    await new Promise((r) => setTimeout(r, 6500));
  }

  if (failed > 0) process.exit(1);
}

void main();
