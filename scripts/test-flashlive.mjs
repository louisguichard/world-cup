#!/usr/bin/env node
/**
 * Probes FlashLive Sports API v1 endpoints.
 * Requires RAPIDAPI_KEY in .env.local and an active RapidAPI subscription.
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

const HOST = "flashlive-sports.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "sportsList", path: "/v1/sports/list" },
  { id: "eventsList", path: "/v1/events/list?indent_days=0&locale=en_INT&sport_id=1&timezone=-4" },
  { id: "eventsChanges", path: "/v1/events/changes?sport_id=1&locale=en_INT" },
  { id: "multiSearch", path: "/v1/search/multi-search?query=Brazil&locale=en_INT&sport_id=1" },
  { id: "rankingsFifa", path: "/v1/rankings/fifa?locale=en_INT" },
  { id: "eventDetails", path: "/v1/events/details?event_id=6ZCocWsb&locale=en_INT" },
  { id: "eventStatistics", path: "/v1/events/statistics?event_id=6ivhWNOG&locale=en_INT" },
  { id: "eventLineups", path: "/v1/events/lineups?event_id=6ivhWNOG&locale=en_INT" },
  { id: "eventSummaryIncidents", path: "/v1/events/summary-incidents?event_id=6ivhWNOG&locale=en_INT" },
  { id: "tournamentResults", path: "/v1/tournaments/results?tournament_stage_id=OEEq9Yvp&page=1&locale=en_INT" },
  { id: "tournamentFixtures", path: "/v1/tournaments/fixtures?tournament_stage_id=OEEq9Yvp&page=1&locale=en_INT" },
  { id: "teamTransfers", path: "/v1/teams/transfers?team_id=Wtn9Stg0&page=1&locale=en_INT" },
  { id: "teamData", path: "/v1/teams/data?team_id=Wtn9Stg0&locale=en_INT" },
  { id: "teamSquad", path: "/v1/teams/squad?team_id=Wtn9Stg0&locale=en_INT" },
  { id: "teamLastEvents", path: "/v1/teams/events/last?team_id=Wtn9Stg0&locale=en_INT" },
  { id: "teamNextEvents", path: "/v1/teams/events/next?team_id=Wtn9Stg0&locale=en_INT" },
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
  console.log(`FlashLive Sports API v1 — ${HOST}\n`);
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const { status, json } = await get(endpoint.path);
    const ok = status === 200;
    const hasData = json && typeof json === "object" && "DATA" in json;
    const detail = ok
      ? hasData
        ? "has DATA"
        : "ok"
      : json?.message ?? status;
    console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
    if (!ok && status !== 403 && status !== 404) failed += 1;
    await new Promise((r) => setTimeout(r, 650));
  }

  if (failed > 0) process.exit(1);
}

void main();
