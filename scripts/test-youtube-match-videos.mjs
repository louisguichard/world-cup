#!/usr/bin/env node
/**
 * Probes YouTube/Google/social RapidAPI endpoints used for match video discovery.
 * Requires RAPIDAPI_KEY in .env.local or environment.
 */
import { existsSync, readFileSync } from "node:fs";

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

async function request(endpoint) {
  const res = await fetch(endpoint.url, {
    method: endpoint.method,
    headers: {
      "Content-Type": endpoint.contentType ?? "application/json",
      "x-rapidapi-host": endpoint.host,
      "x-rapidapi-key": KEY,
    },
    body: endpoint.body,
  });
  const contentType = res.headers.get("content-type") ?? "";
  const text = contentType.includes("image/")
    ? `${contentType} bytes=${(await res.arrayBuffer()).byteLength}`
    : (await res.text()).slice(0, 180);
  return { status: res.status, detail: text };
}

const endpoints = [
  {
    id: "googleRoot",
    method: "GET",
    host: "google-api31.p.rapidapi.com",
    url: "https://google-api31.p.rapidapi.com/",
  },
  {
    id: "googleVideoSearch",
    method: "POST",
    host: "google-api31.p.rapidapi.com",
    url: "https://google-api31.p.rapidapi.com/videosearch",
    body: JSON.stringify({
      text: "FOX Soccer World Cup highlights",
      safesearch: "on",
      timelimit: "",
      duration: "",
      resolution: "",
      region: "us",
      max_results: 5,
    }),
  },
  {
    id: "youtubeScreenshot",
    method: "GET",
    host: "youtube-v2.p.rapidapi.com",
    url: "https://youtube-v2.p.rapidapi.com/video/screenshot?video_id=PuQFESk0BrA&timestamp_s=1200",
  },
  {
    id: "socialContacts",
    method: "GET",
    host: "website-social-scraper-api.p.rapidapi.com",
    url: "https://website-social-scraper-api.p.rapidapi.com/contacts?website=https%3A%2F%2Fwww.foxsports.com%2Fsoccer",
  },
  {
    id: "youtube138FoxVideos",
    method: "POST",
    host: "youtube138.p.rapidapi.com",
    url: "https://youtube138.p.rapidapi.com/channel/videos/",
    body: JSON.stringify({
      id: "UCooTLkxcpnTNx6vfOovfBFA",
      filter: "videos_latest",
      cursor: "",
      hl: "en",
      gl: "US",
    }),
  },
];

let failed = 0;
console.log("YouTube match video API probes\n");
for (const endpoint of endpoints) {
  const { status, detail } = await request(endpoint);
  const ok = status === 200;
  console.log(`${ok ? "PASS" : "FAIL"}\t${endpoint.id}\t${status}\t${detail}`);
  if (!ok && status !== 401 && status !== 403 && status !== 429) failed += 1;
  await new Promise((resolve) => setTimeout(resolve, 700));
}

process.exit(failed > 0 ? 1 : 0);

