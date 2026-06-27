#!/usr/bin/env node
/**
 * Probes Boggio Football Prediction API v2 endpoints.
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

const HOST = "football-prediction-api.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const ENDPOINTS = [
  { id: "listFederations", path: "/api/v2/list-federations" },
  { id: "listMarkets", path: "/api/v2/list-markets" },
  { id: "listCountries", path: "/api/v2/list-countries" },
  { id: "connectionTest", path: "/api/v2/test" },
  { id: "listLeagues", path: "/api/v2/list-leagues?federation=UEFA" },
  { id: "performanceStats", path: "/api/v2/performance-stats?market=classic" },
  { id: "performanceStatsBtts", path: "/api/v2/performance-stats?market=btts" },
  {
    id: "predictions",
    path: "/api/v2/predictions?market=classic&federation=UEFA&iso_date=2018-12-01",
  },
  {
    id: "predictionsConcacaf",
    path: "/api/v2/predictions?market=classic&federation=CONCACAF",
  },
  { id: "fixtureIds", path: "/api/v2/get-list-of-fixture-ids?market=classic&federation=UEFA" },
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
  console.log(`Football Prediction API v2 — ${HOST}\n`);
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const { status, json } = await get(endpoint.path);
    const ok = status === 200;
    const detail =
      ok && Array.isArray(json?.data)
        ? `items=${json.data.length}`
        : ok && json?.data
          ? "has data"
          : json?.message ?? status;
    console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
    if (!ok && status !== 403 && status !== 404) failed += 1;
    await new Promise((r) => setTimeout(r, 700));
  }

  if (failed > 0) process.exit(1);
}

void main();
