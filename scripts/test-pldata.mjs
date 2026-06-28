#!/usr/bin/env node
/**
 * Probes PLData Premier League API endpoints.
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

const HOST = "pldata.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "player", path: "/player/Mohamed%20Salah" },
  { id: "players", path: "/players" },
  { id: "team", path: "/team/Arsenal" },
  { id: "teams", path: "/teams" },
  { id: "club", path: "/club/Arsenal" },
  { id: "clubs", path: "/clubs" },
  { id: "squad", path: "/squad/Arsenal" },
  { id: "squadByTeam", path: "/squad/team/Arsenal" },
  { id: "manager", path: "/manager/Arteta" },
  { id: "coach", path: "/coach/Arteta" },
  { id: "match", path: "/match/1" },
  { id: "matches", path: "/matches" },
  { id: "fixture", path: "/fixture/1" },
  { id: "fixtures", path: "/fixtures" },
  { id: "standings", path: "/standings" },
  { id: "table", path: "/table" },
  { id: "league", path: "/league" },
  { id: "leagues", path: "/leagues" },
  { id: "season", path: "/season/2024" },
  { id: "seasons", path: "/seasons" },
  { id: "stats", path: "/stats" },
  { id: "statsTopScorers", path: "/stats/topscorers" },
  { id: "topscorers", path: "/topscorers" },
  { id: "search", path: "/search/salah" },
  { id: "news", path: "/news" },
  { id: "transfers", path: "/transfers" },
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
  console.log(`PLData API — ${HOST}\n`);
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const { status, json } = await get(endpoint.path);
    const ok = status === 200;
    const detail = ok ? "ok" : json?.message ?? status;
    console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
    if (!ok && status !== 403 && status !== 404 && status !== 429) failed += 1;
    await new Promise((r) => setTimeout(r, 500));
  }

  if (failed > 0) process.exit(1);
}

void main();
