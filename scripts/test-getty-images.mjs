#!/usr/bin/env node
/**
 * Probes Getty Images raygorodskij V1 endpoints (POST form-urlencoded).
 * Requires RAPIDAPI_KEY + GETTY_API_KEY in .env.local.
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const out = {};
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m?.[1] && m[2]) out[m[1]] = m[2].trim();
    }
  }
  return out;
}

const env = loadEnv();
const RAPID_KEY = process.env.RAPIDAPI_KEY ?? env.RAPIDAPI_KEY;
const GETTY_KEY = process.env.GETTY_API_KEY ?? env.GETTY_API_KEY;

if (!RAPID_KEY) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

const HOST = "gettyimagesraygorodskijv1.p.rapidapi.com";
const HDR = "GettyImagesraygorodskijV1.p.rapidapi.com";
const BASE = `https://${HOST}`;

const ENDPOINTS = [
  { id: "getAccessToken", body: { apiKey: GETTY_KEY, apiSecret: env.GETTY_API_SECRET } },
  { id: "getEditorialImagesBySearchQuery", body: { phrase: "FIFA World Cup 2026", page: 1, pageSize: 3, apiKey: GETTY_KEY } },
  { id: "getEventsBySearchQuery", body: { phrase: "FIFA World Cup 2026", page: 1, pageSize: 5, apiKey: GETTY_KEY } },
  { id: "getImagesBySearchQuery", body: { phrase: "World Cup soccer", page: 1, pageSize: 3, apiKey: GETTY_KEY } },
  { id: "GetPreviousPurchases", body: { page: 1, pageSize: 5, apiKey: GETTY_KEY } },
  { id: "getCountriesList", body: { apiKey: GETTY_KEY } },
];

async function post(path, body) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v != null && v !== "") params.set(k, String(v));
  }
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "x-rapidapi-host": HDR,
      "x-rapidapi-key": RAPID_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
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
  console.log(`Getty Images API — ${HOST}\n`);
  let failed = 0;

  for (const endpoint of ENDPOINTS) {
    const { status, json } = await post(endpoint.id, endpoint.body);
    const ok = status === 200;
    const detail = ok ? "ok" : json?.message ?? json?.messages ?? status;
    console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
    if (!ok && status !== 401 && status !== 403 && status !== 429 && status !== 502) failed += 1;
    await new Promise((r) => setTimeout(r, 1200));
  }

  if (failed > 0) process.exit(1);
}

void main();
