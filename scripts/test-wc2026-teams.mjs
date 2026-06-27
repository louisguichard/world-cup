#!/usr/bin/env node
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const KEY = env.match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "world-cup-2026.p.rapidapi.com";
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

const teams = await get("/world-cup-2026/teams");
checks.push([
  "teams + tournament",
  teams.status === 200 && Array.isArray(teams.json?.teams) && teams.json?.tournament?.year === 2026,
  teams.json?.tournament?.host ?? teams.status,
]);

const teamId = teams.json?.teams?.[0]?.id;
if (teamId) {
  await new Promise((r) => setTimeout(r, 500));
  const team = await get(`/world-cup-2026/teams/${teamId}`);
  const withPhoto = (team.json?.players ?? []).filter((p) => p?.image).length;
  checks.push(["get team + players", team.status === 200 && withPhoto > 0, withPhoto || team.status]);
}

await new Promise((r) => setTimeout(r, 500));
const players = await get("/world-cup-2026/players");
const photoCount = (players.json?.players ?? []).filter((p) => p?.image).length;
checks.push(["get players", players.status === 200 && photoCount > 0, photoCount || players.status]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
