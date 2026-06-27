#!/usr/bin/env node
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const KEY = env.match(/^RAPIDAPI_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "world-cup1.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
};

const ENDPOINTS = [
  "/winners/",
  "/world_cups_details/",
  "/golden_ball/",
  "/golden_boot/",
  "/best_young_player/",
  "/golden_glove/",
];

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
for (let i = 0; i < ENDPOINTS.length; i += 1) {
  if (i > 0) await new Promise((r) => setTimeout(r, 900));
  const path = ENDPOINTS[i];
  const result = await get(path);
  const ok = result.status === 200 || result.status === 429;
  const detail =
    result.status === 200
      ? Array.isArray(result.json)
        ? result.json.length
        : typeof result.json === "object"
          ? Object.keys(result.json ?? {}).length
          : "ok"
      : result.status;
  checks.push([path, ok, detail]);
}

let failed = 0;
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}\t${name}\t${detail}`);
  if (!ok) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
