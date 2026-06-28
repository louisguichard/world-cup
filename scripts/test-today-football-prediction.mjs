#!/usr/bin/env node
/**
 * Probes Today Football Prediction API endpoints.
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

const HOST = "today-football-prediction.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "leagues", path: "/leagues/" },
  { id: "performance", path: "/stats/performance" },
  { id: "predictionsList", path: "/predictions/list?page=1&market=1X2" },
  { id: "vipFeatured", path: "/predictions/featured?page=1" },
  { id: "vipScores", path: "/predictions/scores?page=1" },
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
  } else if (json?.leagues) {
    console.log(`  leagues: ${json.leagues.length}`);
  } else if (json?.matches) {
    console.log(`  matches: ${json.matches.length}`);
  }
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
