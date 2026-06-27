#!/usr/bin/env node
/**
 * Probes AllSportsAPI2 endpoints on RapidAPI.
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

const HOST = "allsportsapi2.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "tennisAtpRankings", path: "/api/tennis/rankings/atp" },
  { id: "tennisWtaRankings", path: "/api/tennis/rankings/wta" },
  { id: "footballLive", path: "/api/football/events/live" },
  { id: "footballWcTournament", path: "/api/football/unique-tournament/16" },
  { id: "basketballTournaments", path: "/api/basketball/tournament/all" },
  { id: "searchAll", path: "/api/search/all?query=world%20cup" },
];

async function probe({ id, path }) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: hdr });
    const ms = Date.now() - started;
    const body = await res.text();
    const preview = body.slice(0, 140).replace(/\s+/g, " ");
    console.log(`${res.ok ? "OK" : "FAIL"} ${id} ${res.status} ${ms}ms — ${preview}`);
    return res.ok;
  } catch (err) {
    console.log(`ERR ${id} — ${String(err)}`);
    return false;
  }
}

console.log(`Probing ${HOST} (${ENDPOINTS.length} endpoints)…\n`);
let ok = 0;
for (const ep of ENDPOINTS) {
  if (await probe(ep)) ok += 1;
}
console.log(`\n${ok}/${ENDPOINTS.length} succeeded`);
process.exit(ok > 0 ? 0 : 1);
