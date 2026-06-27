#!/usr/bin/env node
import { readFileSync } from "node:fs";

const KEY = readFileSync(".env.local", "utf8").match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "sofascore.p.rapidapi.com";
const hdr = { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY, Accept: "application/json" };

async function get(path) {
  await new Promise((r) => setTimeout(r, 700));
  const res = await fetch(`https://${HOST}${path}`, { headers: hdr });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 80);
  }
  return { status: res.status, json };
}

const checks = [];
const team = await get("/teams/detail?teamId=4748");
checks.push(["teams/detail", team.status === 200 && team.json?.team?.name === "Brazil", team.json?.team?.name ?? team.status]);

const squad = await get("/teams/get-squad?teamId=4748");
checks.push(["teams/get-squad", squad.status === 200 && Array.isArray(squad.json?.players), squad.json?.players?.length ?? squad.status]);

const standings = await get("/tournaments/get-standings?tournamentId=16&seasonId=58210");
checks.push(["tournaments/get-standings", standings.status === 200 && Array.isArray(standings.json?.standings), standings.json?.standings?.length ?? standings.status]);

const h2h = await get("/matches/get-h2h?matchId=12813012");
checks.push(["matches/get-h2h", h2h.status === 200 && h2h.json?.teamDuel, JSON.stringify(h2h.json?.teamDuel ?? h2h.status)]);

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}
process.exit(failed > 0 ? 1 : 0);
