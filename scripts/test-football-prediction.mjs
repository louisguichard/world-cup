#!/usr/bin/env node
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const KEY = env.match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "today-football-prediction.p.rapidapi.com";
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

const leagues = await get("/leagues/");
checks.push(["leagues", leagues.status === 200 && Array.isArray(leagues.json?.leagues), leagues.json?.leagues?.length ?? leagues.status]);

await new Promise((r) => setTimeout(r, 800));
const list = await get("/predictions/list?page=1");
checks.push(["predictions/list", list.status === 200 && Array.isArray(list.json?.matches), list.json?.matches?.length ?? list.status]);

await new Promise((r) => setTimeout(r, 800));
const perf = await get("/stats/performance");
checks.push(["stats/performance", perf.status === 200 && perf.json?.date, perf.json?.date ?? perf.status]);

await new Promise((r) => setTimeout(r, 800));
const vip = await get("/predictions/featured?page=1");
checks.push(["vip/featured (optional)", vip.status === 200 || vip.status === 401, vip.status]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
