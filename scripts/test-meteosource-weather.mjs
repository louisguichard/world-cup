#!/usr/bin/env node
/**
 * Probes Meteosource AI Weather API endpoints (RapidAPI).
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

const HOST = "ai-weather-by-meteosource.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  {
    id: "pointHardRock",
    path: "/point?lat=25.958&lon=-80.239&sections=current,hourly&units=auto",
  },
  {
    id: "pointSoFi",
    path: "/point?lat=33.953&lon=-118.339&sections=current&units=auto",
  },
  {
    id: "timeMachine",
    path: "/time_machine?lat=37.81021&lon=-122.42282&date=2021-08-24&units=auto",
  },
  { id: "findPlaces", path: "/find_places?text=Miami" },
  { id: "findPlacesPrefix", path: "/find_places_prefix?text=Mia" },
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

  const preview =
    typeof json === "object" && json !== null
      ? JSON.stringify(json).slice(0, 120)
      : String(json);

  console.log(`${pass ? "✓" : "✗"} ${ep.id} → HTTP ${status}`);
  if (!pass) console.log(`  ${preview}`);
  else if (json?.current) {
    console.log(
      `  current: ${json.current.summary ?? json.current.weather} ${json.current.temperature}° (${json.units})`
    );
  }
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
