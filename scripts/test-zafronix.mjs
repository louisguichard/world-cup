#!/usr/bin/env node
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const RAPID = env.match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
const ZAF =
  env.match(/^VITE_ZAFRONIX_API_KEY=(.+)$/m)?.[1]?.trim() ||
  env.match(/^ZAFRONIX_API_KEY=(.+)$/m)?.[1]?.trim();

if (!RAPID) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "zafronix-fifa-world-cup-api.p.rapidapi.com";
const BASE = `https://${HOST}`;

function hdr(method = "GET") {
  return {
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": RAPID,
    Accept: "application/json",
    ...(ZAF ? { "X-API-Key": ZAF } : {}),
    ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
  };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: hdr() });
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

const health = await get("/health");
checks.push(["health", health.status === 200 || health.status === 429, health.status]);

await new Promise((r) => setTimeout(r, 400));
const meta = await get("/");
checks.push(["meta /", meta.status === 200 || meta.status === 429, meta.status]);

await new Promise((r) => setTimeout(r, 400));
const tournaments = await get("/tournaments");
checks.push(["tournaments", tournaments.status === 200 || tournaments.status === 429, tournaments.status]);

await new Promise((r) => setTimeout(r, 400));
const standings = await get("/standings?year=2026");
checks.push(["standings", standings.status === 200 || standings.status === 429, standings.status]);

await new Promise((r) => setTimeout(r, 400));
const teams = await get("/teams");
const teamCount = Array.isArray(teams.json) ? teams.json.length : teams.json?.teams?.length;
checks.push(["teams", teams.status === 200 || teams.status === 429, teamCount ?? teams.status]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
