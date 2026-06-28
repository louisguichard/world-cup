#!/usr/bin/env node
/**
 * Probes FootAPI7 endpoints (RapidAPI).
 * Requires RAPIDAPI_KEY in .env.local and an active subscription.
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

const HOST = "footapi7.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const TOURNAMENT = 17;
const SEASON = 76986;
const TODAY = new Date().toISOString().slice(0, 10);

const ENDPOINTS = [
  { id: "groups", path: `/api/tournament/${TOURNAMENT}/season/${SEASON}/groups` },
  { id: "standings", path: `/api/tournament/${TOURNAMENT}/season/${SEASON}/standings` },
  { id: "teams", path: `/api/tournament/${TOURNAMENT}/season/${SEASON}/teams` },
  { id: "rounds", path: `/api/tournament/${TOURNAMENT}/season/${SEASON}/rounds` },
  { id: "knockout", path: `/api/tournament/${TOURNAMENT}/season/${SEASON}/knockout` },
  { id: "seasons", path: `/api/tournaments/${TOURNAMENT}/seasons` },
  { id: "matchesLive", path: "/api/matches/live" },
  { id: "matchesByDate", path: `/api/matches/${TODAY}` },
  { id: "leagues", path: "/api/leagues" },
];

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: hdr });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 200);
  }
  return { status: res.status, json };
}

console.log(`Probing ${HOST} (${ENDPOINTS.length} endpoints)…\n`);

let ok = 0;
let fail = 0;

for (const ep of ENDPOINTS) {
  const { status, json } = await get(ep.path);
  const pass = status === 200;
  if (pass) ok++;
  else fail++;

  console.log(`${pass ? "✓" : "✗"} ${ep.id} → HTTP ${status}`);
  if (!pass) {
    console.log(`  ${typeof json === "string" ? json : JSON.stringify(json).slice(0, 120)}`);
  }
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
