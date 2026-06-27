#!/usr/bin/env node
/**
 * Live integration smoke test for SofaScore6 RapidAPI.
 * Run: node scripts/test-sofascore6.mjs
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

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: hdr });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 120);
  }
  return { status: res.status, json };
}

const checks = [];

const live = await get("/api/sofascore/v1/match/live?sport_slug=football");
const liveEvents = Array.isArray(live.json) ? live.json : [];
checks.push(["match/live", live.status === 200 && liveEvents.length >= 0, liveEvents.length]);

const wcLive = liveEvents.filter((e) => e.uniqueTournament?.id === 16);
const matchId = wcLive[0]?.id ?? liveEvents[0]?.id;
checks.push(["wc live filter", wcLive.length >= 0, wcLive.length]);

if (matchId) {
  for (const [name, path] of [
    ["details", `/api/sofascore/v1/match/details?match_id=${matchId}`],
    ["incidents", `/api/sofascore/v1/match/incidents?match_id=${matchId}`],
    ["lineups", `/api/sofascore/v1/match/lineups?match_id=${matchId}`],
    ["statistics", `/api/sofascore/v1/match/statistics?match_id=${matchId}`],
    ["comments", `/api/sofascore/v1/match/comments?match_id=${matchId}`],
  ]) {
    const r = await get(path);
    checks.push([`match/${name}`, r.status === 200, r.status]);
  }
}

const search = await get("/api/sofascore/v1/search/all?q=world+cup");
checks.push(["search/all", search.status === 200 && Array.isArray(search.json), search.json?.length ?? 0]);

const sports = await get("/api/sofascore/v1/general/sports");
checks.push(["general/sports", sports.status === 200 && Array.isArray(sports.json), sports.json?.length ?? 0]);

const team = await get("/api/sofascore/v1/team/details?team_id=4748");
checks.push(["team/details", team.status === 200 && team.json?.name === "Brazil", team.json?.name ?? team.status]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
