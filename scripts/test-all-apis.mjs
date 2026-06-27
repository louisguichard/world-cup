/**
 * Probes every external API the app uses (direct + dev-proxy).
 * Run: node scripts/test-all-apis.mjs
 */

import { writeFileSync } from "node:fs";

const TIMEOUT_MS = 12_000;
const PROXY_BASE = "http://127.0.0.1:5173";
const args = process.argv.slice(2);
const aggressive = args.includes("--aggressive");
const TODAY = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ?? process.env.VITE_RAPIDAPI_KEY ?? "";

const rapidHeaders = (host) => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-rapidapi-host": host,
  ...(RAPIDAPI_KEY ? { "x-rapidapi-key": RAPIDAPI_KEY } : {}),
});

const ESPN_SCOREBOARD =
  "/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";

async function probe({ label, url, headers = { Accept: "application/json" }, splashBlocking = false, parse }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const ms = Date.now() - start;
    const body = await res.text();
    let detail;
    let ok = res.ok;
    try {
      detail = parse({ res, body, status: res.status });
      if (detail.startsWith("FAIL")) ok = false;
    } catch (e) {
      ok = false;
      detail = e instanceof Error ? e.message : String(e);
    }
    return { label, url, ok, ms, detail, splashBlocking };
  } catch (e) {
    return {
      label,
      url,
      ok: false,
      ms: Date.now() - start,
      detail: e.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e.message,
      splashBlocking
    };
  } finally {
    clearTimeout(timer);
  }
}

const polyGames = (offset) =>
  `/events?tag_slug=games&active=true&closed=false&limit=100&offset=${offset}&end_date_min=2026-06-11T00:00:00Z&end_date_max=2026-07-20T23:59:00Z`;

const sofaHeaders = {
  Accept: "application/json",
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com"
};

const tests = [
  {
    label: "ESPN scoreboard (direct)",
    url: `https://site.api.espn.com${ESPN_SCOREBOARD}`,
    splashBlocking: true,
    parse: ({ body }) => {
      const d = JSON.parse(body);
      return `events=${d.events?.length ?? 0}`;
    }
  },
  {
    label: "ESPN scoreboard (vite proxy)",
    url: `${PROXY_BASE}/espn${ESPN_SCOREBOARD}`,
    splashBlocking: true,
    parse: ({ body }) => {
      const d = JSON.parse(body);
      return `events=${d.events?.length ?? 0}`;
    }
  },
  {
    label: "ESPN play-by-play (direct)",
    url: "https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/playbyplay?event=401234567",
    parse: ({ status }) => (status < 500 ? `HTTP ${status} (endpoint reachable)` : "FAIL: server error")
  },
  {
    label: "ESPN play-by-play (vite proxy)",
    url: `${PROXY_BASE}/espn-web/apis/site/v2/sports/soccer/fifa.world/playbyplay?event=401234567`,
    parse: ({ status }) => (status < 500 ? `HTTP ${status} (endpoint reachable)` : "FAIL: server error")
  },
  {
    label: "Polymarket winner (direct)",
    url: "https://gamma-api.polymarket.com/events/slug/world-cup-winner",
    parse: ({ body }) => {
      const d = JSON.parse(body);
      return `markets=${d.markets?.length ?? 0}`;
    }
  },
  {
    label: "Polymarket winner (vite proxy)",
    url: `${PROXY_BASE}/poly/events/slug/world-cup-winner`,
    parse: ({ body }) => {
      const d = JSON.parse(body);
      return `markets=${d.markets?.length ?? 0}`;
    }
  },
  {
    label: "FIFA rankings (direct)",
    url: "https://www.fifa.com/api/v3/rankings?gender=1&count=211&locale=en",
    parse: ({ body }) => {
      if (body.trimStart().startsWith("<")) return "FAIL: HTML response (API blocked)";
      const d = JSON.parse(body);
      return Array.isArray(d.Results) ? `results=${d.Results.length}` : "FAIL: unexpected shape";
    }
  },
  {
    label: "FIFA rankings (vite proxy)",
    url: `${PROXY_BASE}/fifa-api/api/v3/rankings?gender=1&count=211&locale=en`,
    parse: ({ body }) => {
      if (body.trimStart().startsWith("<")) return "FAIL: HTML response (API blocked)";
      const d = JSON.parse(body);
      return Array.isArray(d.Results) ? `results=${d.Results.length}` : "FAIL: unexpected shape";
    }
  },
  {
    label: "SofaScore scheduled (direct)",
    url: `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${TODAY}`,
    headers: sofaHeaders,
    parse: ({ body, status }) => {
      const d = JSON.parse(body);
      if (status === 403 || d.error?.code === 403) return "FAIL: 403 forbidden";
      return `events=${d.events?.length ?? 0}`;
    }
  },
  {
    label: "SofaScore scheduled (vite proxy)",
    url: `${PROXY_BASE}/api/sofascore/sport/football/scheduled-events/${TODAY}`,
    headers: sofaHeaders,
    parse: ({ body, status }) => {
      const d = JSON.parse(body);
      if (status === 403 || d.error?.code === 403) return "FAIL: 403 forbidden";
      return `events=${d.events?.length ?? 0}`;
    }
  },
  {
    label: "ClubElo Brazil (direct)",
    url: "http://api.clubelo.com/Brazil",
    parse: ({ body }) => {
      const line = body.trim().split("\n").pop() ?? "";
      return line.includes(",") ? "elo row ok" : "FAIL: unexpected format";
    }
  },
  {
    label: "ClubElo Brazil (vite proxy)",
    url: `${PROXY_BASE}/api/clubelo/Brazil`,
    parse: ({ body }) => {
      const line = body.trim().split("\n").pop() ?? "";
      return line.includes(",") ? "elo row ok" : "FAIL: unexpected format";
    }
  },
  {
    label: "RapidAPI Zafronix health (direct)",
    url: "https://zafronix-fifa-world-cup-api.p.rapidapi.com/health",
    headers: rapidHeaders("zafronix-fifa-world-cup-api.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return d.ok ? "health ok" : `keys=${Object.keys(d).join(",")}`;
    },
  },
  {
    label: "RapidAPI Zafronix health (vite proxy)",
    url: `${PROXY_BASE}/api/zafronix/health`,
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return d.ok ? "health ok" : `keys=${Object.keys(d).join(",")}`;
    },
  },
  {
    label: "RapidAPI FotMob matches-by-date (direct)",
    url: `https://free-api-live-football-data.p.rapidapi.com/football-get-matches-by-date?date=${TODAY}`,
    headers: rapidHeaders("free-api-live-football-data.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status} (check RAPIDAPI_KEY)`;
      const d = JSON.parse(body);
      const matches = d.response?.matches ?? [];
      return `matches=${matches.length}`;
    },
  },
  {
    label: "RapidAPI FotMob matches-by-date (vite proxy)",
    url: `${PROXY_BASE}/rapidapi/football-get-matches-by-date?date=${TODAY}`,
    headers: rapidHeaders("free-api-live-football-data.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      const matches = d.response?.matches ?? [];
      return `matches=${matches.length}`;
    },
  },
  {
    label: "SofaScore6 match live (direct)",
    url: "https://sofascore6.p.rapidapi.com/api/sofascore/v1/match/live?sport_slug=football",
    headers: rapidHeaders("sofascore6.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      const events = Array.isArray(d) ? d : d.events ?? [];
      return `events=${events.length}`;
    },
  },
  {
    label: "SofaScore6 match live (vite proxy)",
    url: `${PROXY_BASE}/api/sofascore6/api/sofascore/v1/match/live?sport_slug=football`,
    headers: rapidHeaders("sofascore6.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      const events = Array.isArray(d) ? d : d.events ?? [];
      return `events=${events.length}`;
    },
  },
  {
    label: "SofaScore6 search/all (direct)",
    url: "https://sofascore6.p.rapidapi.com/api/sofascore/v1/search/all?q=world+cup",
    headers: rapidHeaders("sofascore6.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return `results=${Array.isArray(d) ? d.length : 0}`;
    },
  },
  {
    label: "WC2026 teams (direct)",
    url: "https://world-cup-2026.p.rapidapi.com/world-cup-2026/teams",
    headers: rapidHeaders("world-cup-2026.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return `teams=${d.teams?.length ?? 0}`;
    },
  },
  {
    label: "WC2026 teams (vite proxy)",
    url: `${PROXY_BASE}/rapidapi-wc2026/world-cup-2026/teams`,
    headers: rapidHeaders("world-cup-2026.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return `teams=${d.teams?.length ?? 0}`;
    },
  },
  {
    label: "WC2026 Live /wc/live (direct)",
    url: "https://world-cup-2026-live-api.p.rapidapi.com/wc/live",
    headers: rapidHeaders("world-cup-2026-live-api.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      if (status === 404) return `HTTP 404 (no live matches)`;
      const d = JSON.parse(body);
      return `matches=${Array.isArray(d) ? d.length : JSON.stringify(d).slice(0, 60)}`;
    },
  },
  {
    label: "WC2026 Live /wc/live (vite proxy)",
    url: `${PROXY_BASE}/rapidapi-wc-live/wc/live`,
    headers: rapidHeaders("world-cup-2026-live-api.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      if (status === 404) return `HTTP 404 (no live matches)`;
      const d = JSON.parse(body);
      return `matches=${Array.isArray(d) ? d.length : JSON.stringify(d).slice(0, 60)}`;
    },
  },
  {
    label: "Open Weather 13 (direct)",
    url: "https://open-weather13.p.rapidapi.com/city?city=New%20York&lang=EN",
    headers: rapidHeaders("open-weather13.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return `city=${d.name ?? "?"}, temp=${d.main?.temp ?? "?"}`;
    },
  },
  {
    label: "Open Weather 13 (vite proxy)",
    url: `${PROXY_BASE}/rapidapi-weather/city?city=New%20York&lang=EN`,
    headers: rapidHeaders("open-weather13.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      const d = JSON.parse(body);
      return `city=${d.name ?? "?"}, temp=${d.main?.temp ?? "?"}`;
    },
  },
  {
    label: "Sports Odds Intelligence (direct)",
    url: "https://sports-odds-intelligence-api.p.rapidapi.com/soccer/",
    headers: rapidHeaders("sports-odds-intelligence-api.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      if (status === 404) return `HTTP 404 (check exact endpoint)`;
      const d = JSON.parse(body);
      return `ok, keys=${Object.keys(d).join(",")}`;
    },
  },
  {
    label: "Sports Odds Intelligence (vite proxy)",
    url: `${PROXY_BASE}/rapidapi-odds/soccer/`,
    headers: rapidHeaders("sports-odds-intelligence-api.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ body, status }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status}`;
      if (status === 404) return `HTTP 404 (check exact endpoint)`;
      const d = JSON.parse(body);
      return `ok, keys=${Object.keys(d).join(",")}`;
    },
  },
  {
    label: "TVView getAll (direct)",
    url: "https://tvview.p.rapidapi.com/getAll",
    headers: rapidHeaders("tvview.p.rapidapi.com"),
    skip: !RAPIDAPI_KEY,
    parse: ({ status, body }) => {
      if (status === 401 || status === 403) return `FAIL: HTTP ${status} (subscription/key required)`;
      if (status === 429) return "HTTP 429 (quota reached)";
      const d = JSON.parse(body);
      const count = Array.isArray(d)
        ? d.length
        : Array.isArray(d.data)
          ? d.data.length
          : Array.isArray(d.items)
            ? d.items.length
            : 0;
      return `entries=${count}`;
    },
  },
  ...Array.from({ length: 8 }, (_, i) => i * 100).map((offset) => ({
    label: `Polymarket games offset=${offset} (direct)`,
    url: `https://gamma-api.polymarket.com${polyGames(offset)}`,
    parse: ({ body }) => {
      const d = JSON.parse(body);
      return `events=${Array.isArray(d) ? d.length : 0}`;
    }
  }))
];

const results = [];
for (const t of tests) {
  if (
    !aggressive &&
    (
      t.label.includes("(vite proxy)") ||
      /offset=(100|200|300|400|500|600|700)/.test(t.label) ||
      /(world-cup1|sport-highlights|all-sport-live-stream|sports-live-scores|free-daily-xtream-iptv|cloud-api-hub-iptv|tvview|flashlive)/.test(t.url)
    )
  ) {
    results.push({
      label: t.label,
      url: t.url,
      ok: true,
      ms: 0,
      detail: "SKIP: conservative mode (use --aggressive to force high-usage checks)",
      splashBlocking: t.splashBlocking ?? false,
    });
    process.stdout.write("s");
    continue;
  }
  if (t.skip) {
    results.push({
      label: t.label,
      url: t.url,
      ok: true,
      ms: 0,
      detail: "SKIP: no RAPIDAPI_KEY",
      splashBlocking: t.splashBlocking ?? false,
    });
    process.stdout.write("s");
    continue;
  }
  const r = await probe(t);
  results.push(r);
  process.stdout.write(r.ok ? "." : "F");
}

console.log("\n");
const failed = results.filter((r) => !r.ok);
const splashFailed = results.filter((r) => r.splashBlocking && !r.ok);

for (const r of results) {
  const flag = r.ok ? "PASS" : "FAIL";
  const block = r.splashBlocking ? " [SPLASH]" : "";
  console.log(`${flag}${block} ${r.ms}ms — ${r.label}: ${r.detail}`);
}

console.log(`\nTotal: ${results.length} | Pass: ${results.length - failed.length} | Fail: ${failed.length}`);
console.log(`Splash-blocking failures: ${splashFailed.length}`);
if (!aggressive) {
  console.log("Conservative mode enabled. Re-run with --aggressive for full API sweep.");
}

writeFileSync("scripts/api-audit-results.json", JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
