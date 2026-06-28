#!/usr/bin/env node
/**
 * Probes TVPro API endpoints on RapidAPI.
 * Requires RAPIDAPI_KEY in .env.local and an active TVPro subscription.
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

const HOST = "tvpro-api.p.rapidapi.com";
const BASE = `https://${HOST}`;
const hdr = {
  "x-rapidapi-host": HOST,
  "x-rapidapi-key": KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const GET_ENDPOINTS = [
  { id: "channelsTv", path: "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv?mod=tv&RapidApi=jlospino" },
  { id: "channelsVix", path: "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv?mod=vix&RapidApi=jlospino" },
  { id: "channelsStar", path: "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv?mod=star&RapidApi=jlospino" },
];

async function probeGet({ id, path }) {
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

async function probePost({ id, path, body }) {
  const url = `${BASE}${path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...hdr, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });
    const ms = Date.now() - started;
    const text = await res.text();
    const preview = text.slice(0, 140).replace(/\s+/g, " ");
    console.log(`${res.ok ? "OK" : "FAIL"} ${id} ${res.status} ${ms}ms — ${preview}`);
    return res.ok;
  } catch (err) {
    console.log(`ERR ${id} — ${String(err)}`);
    return false;
  }
}

console.log(`Probing ${HOST}…\n`);

let ok = 0;
for (const ep of GET_ENDPOINTS) {
  if (await probeGet(ep)) ok += 1;
}

const email = process.env.TVPRO_EMAIL ?? process.env.VITE_TVPRO_EMAIL;
const password = process.env.TVPRO_PASSWORD ?? process.env.VITE_TVPRO_PASSWORD;
if (email && password) {
  const tokenOk = await probePost({
    id: "token",
    path: "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv/token.php",
    body: { email, password },
  });
  if (tokenOk) ok += 1;
} else {
  console.log("SKIP token/post — set TVPRO_EMAIL and TVPRO_PASSWORD to probe authenticated endpoints");
}

console.log(`\n${ok} succeeded`);
process.exit(ok > 0 ? 0 : 1);
