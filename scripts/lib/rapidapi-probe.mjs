/**
 * Shared RapidAPI probe helpers for test-rapidapi.mjs and test-rapidapi-full.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "../..");
export const DEFAULT_TIMEOUT_MS = 12_000;
export const DEFAULT_PROXY_BASE = "http://127.0.0.1:5173";

/** Load keys from .env.local when not in process.env */
export function loadKeyFromEnvFile() {
  if (process.env.RAPIDAPI_KEY || process.env.VITE_RAPIDAPI_KEY) {
    return {
      rapidApiKey: process.env.RAPIDAPI_KEY ?? process.env.VITE_RAPIDAPI_KEY ?? "",
      zafronixKey: process.env.ZAFRONIX_API_KEY ?? process.env.VITE_ZAFRONIX_API_KEY ?? "",
    };
  }
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    return { rapidApiKey: "", zafronixKey: "" };
  }
  const text = readFileSync(envPath, "utf8");
  let rapidApiKey = "";
  let zafronixKey = "";
  for (const line of text.split("\n")) {
    const rapid = /^(RAPIDAPI_KEY|VITE_RAPIDAPI_KEY)=(.*)$/.exec(line.trim());
    if (rapid?.[2] && rapid[2] !== "FILL_ME_IN") rapidApiKey = rapid[2];
    const z = /^(ZAFRONIX_API_KEY|VITE_ZAFRONIX_API_KEY)=(.*)$/.exec(line.trim());
    if (z?.[2] && z[2] !== "FILL_ME_IN") zafronixKey = z[2];
  }
  return { rapidApiKey, zafronixKey };
}

export function loadCatalog() {
  const raw = readFileSync(join(ROOT, "config/rapidapi-catalog.json"), "utf8");
  return JSON.parse(raw);
}

export function rapidHeaders(apiKey, host, zafronixKey) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-rapidapi-host": host,
    ...(apiKey ? { "x-rapidapi-key": apiKey } : {}),
  };
  if (zafronixKey && host.includes("zafronix")) {
    headers["X-API-Key"] = zafronixKey;
  }
  return headers;
}

export function todayYyyymmdd() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function interpolatePath(template, ctx) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const val = ctx[key];
    return val === undefined || val === null ? `{${key}}` : String(val);
  });
}

function pickJsonPath(obj, path) {
  let cur = obj;
  for (const part of path.split(".")) {
    if (cur == null) return undefined;
    const idx = Number(part);
    cur = Number.isInteger(idx) && String(idx) === part ? cur[idx] : cur[part];
  }
  return cur;
}

async function fetchJson(url, apiKey, host, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: rapidHeaders(apiKey, host),
      signal: controller.signal,
    });
    const body = await res.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      json = null;
    }
    return { res, body, json };
  } finally {
    clearTimeout(timer);
  }
}

/** Build resolver context (dynamic ids from prior API responses). */
export async function buildResolverContext(
  apiKey,
  catalog,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  options = {}
) {
  const { conservative = false } = options;
  const ctx = {
    todayYyyymmdd: todayYyyymmdd(),
    todayIso: todayIso(),
    sampleMatchId: "M65",
  };

  if (conservative) {
    return ctx;
  }

  const football = catalog.find((p) => p.id === "footballData");
  if (football) {
    const path = interpolatePath("/football-get-matches-by-date?date={todayYyyymmdd}", ctx);
    const url = `https://${football.host}${path}`;
    const { json } = await fetchJson(url, apiKey, football.host, timeoutMs);
    const matches = json?.response?.matches ?? json?.response?.live ?? [];
    const first = matches[0];
    const homeId = first?.home?.id ?? first?.homeTeam?.id;
    if (homeId != null) ctx.footballTeamId = String(homeId);
  }

  const sport = catalog.find((p) => p.id === "sportApi7");
  if (sport) {
    const path = interpolatePath("/api/v1/category/1468/scheduled-events/{todayIso}", ctx);
    const url = `https://${sport.host}${path}`;
    const { json } = await fetchJson(url, apiKey, sport.host, timeoutMs);
    const eventId = json?.events?.[0]?.id;
    if (eventId != null) ctx.sportApiEventId = String(eventId);
  }

  const wcTeams = catalog.find((p) => p.id === "wc2026Teams");
  if (wcTeams) {
    const url = `https://${wcTeams.host}/world-cup-2026/teams`;
    const { json } = await fetchJson(url, apiKey, wcTeams.host, timeoutMs);
    const teamId = json?.teams?.[0]?.id ?? json?.teams?.[0]?.abbreviation;
    if (teamId != null) ctx.wc2026TeamId = encodeURIComponent(String(teamId));
  }

  const odds = catalog.find((p) => p.id === "oddsIntelligence");
  if (odds) {
    const url = `https://${odds.host}/soccer/`;
    const { json } = await fetchJson(url, apiKey, odds.host, timeoutMs);
    const eventId = json?.data?.[0]?.id;
    if (eventId != null) ctx.oddsEventId = String(eventId);
  }

  return ctx;
}

function buildUrl(provider, path, mode, proxyBase) {
  if (mode === "proxy") {
    return `${proxyBase}${provider.devProxyPrefix ?? ""}${path}`;
  }
  return `https://${provider.host}${path}`;
}

function evaluateResult(status, acceptStatuses, body) {
  if (status === 401 && acceptStatuses.includes(401)) {
    return {
      ok: true,
      detail: "HTTP 401 — endpoint reachable (needs VITE_ZAFRONIX_API_KEY from zafronix.com)",
    };
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      detail: `FAIL: HTTP ${status} — auth or subscription issue`,
    };
  }
  if (status === 429) {
    return {
      ok: true,
      detail: "HTTP 429 — rate limited (key/subscription OK, retry later)",
    };
  }
  if (acceptStatuses.includes(status)) {
    let detail = `HTTP ${status}`;
    if (status === 404) {
      detail += " (no data — endpoint reachable)";
    } else {
      try {
        const d = JSON.parse(body);
        if (Array.isArray(d)) detail += ` — ${d.length} items`;
        else if (d && typeof d === "object") detail += ` — keys: ${Object.keys(d).slice(0, 6).join(", ")}`;
      } catch {
        detail += ` — ${body.length} bytes`;
      }
    }
    return { ok: true, detail };
  }
  return {
    ok: false,
    detail: `FAIL: HTTP ${status} — ${body.slice(0, 120)}`,
  };
}

export async function probeEndpoint({
  provider,
  endpoint,
  apiKey,
  zafronixKey,
  ctx,
  mode = "direct",
  proxyBase = DEFAULT_PROXY_BASE,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const path = interpolatePath(endpoint.path, ctx);
  if (path.includes("{")) {
    if (endpoint.skipIfUnresolved) {
      return {
        providerId: provider.id,
        providerLabel: provider.label,
        endpointId: endpoint.id,
        fn: endpoint.fn,
        host: provider.host,
        path,
        url: "",
        ok: true,
        skipped: true,
        ms: 0,
        status: 0,
        detail: "SKIP — could not resolve dynamic path (no sample data)",
      };
    }
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url: "",
      ok: false,
      ms: 0,
      status: 0,
      detail: `FAIL — unresolved placeholders in path: ${path}`,
    };
  }

  const url = buildUrl(provider, path, mode, proxyBase);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      headers: rapidHeaders(apiKey, provider.host, endpoint.requiresZafronixKey ? zafronixKey : undefined),
      signal: controller.signal,
    });
    const ms = Date.now() - start;
    const body = await res.text();
    const acceptStatuses = endpoint.acceptStatuses ?? [200];
    const { ok, detail } = evaluateResult(res.status, acceptStatuses, body);

    return {
      providerId: provider.id,
      providerLabel: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url,
      ok,
      skipped: false,
      ms,
      status: res.status,
      detail,
      mode,
    };
  } catch (e) {
    return {
      providerId: provider.id,
      providerLabel: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url: buildUrl(provider, path, mode, proxyBase),
      ok: false,
      skipped: false,
      ms: Date.now() - start,
      status: 0,
      detail: e.name === "AbortError" ? `Timeout after ${timeoutMs}ms` : e.message,
      mode,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function runSmokeProbes(apiKey, catalog, options = {}) {
  const {
    mode = "direct",
    proxyBase = DEFAULT_PROXY_BASE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    zafronixKey = "",
    conservativeResolver = true,
  } = options;
  const ctx = await buildResolverContext(apiKey, catalog, timeoutMs, { conservative: conservativeResolver });
  const results = [];

  for (const provider of catalog) {
    const smokePath = interpolatePath(provider.testPath ?? provider.endpoints?.[0]?.path ?? "", ctx);
    const endpoint = {
      id: "smoke",
      fn: "smoke",
      path: smokePath,
      acceptStatuses: provider.id === "wc2026Live" ? [200, 404] : [200],
    };
    const r = await probeEndpoint({ provider, endpoint, apiKey, zafronixKey, ctx, mode, proxyBase, timeoutMs });
    results.push({ ...r, label: provider.label });
  }
  return results;
}

export async function runFullProbes(apiKey, catalog, options = {}) {
  const {
    mode = "direct",
    proxyBase = DEFAULT_PROXY_BASE,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    zafronixKey = "",
    maxCalls = Number.POSITIVE_INFINITY,
    conservativeResolver = true,
  } = options;
  const ctx = await buildResolverContext(apiKey, catalog, timeoutMs, { conservative: conservativeResolver });
  const results = [];
  let calls = 0;

  for (const provider of catalog) {
    for (const endpoint of provider.endpoints ?? []) {
      if (calls >= maxCalls) {
        return { results, ctx, truncated: true };
      }
      const r = await probeEndpoint({ provider, endpoint, apiKey, zafronixKey, ctx, mode, proxyBase, timeoutMs });
      results.push(r);
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return { results, ctx, truncated: false };
}

export function printSummary(results, title) {
  console.log(`\n${title}`);
  for (const r of results) {
    const tag = r.skipped ? "SKIP" : r.ok ? "PASS" : "FAIL";
    const mode = r.mode ? ` [${r.mode}]` : "";
    const fn = r.fn ? `${r.fn}: ` : "";
    console.log(`${tag}${mode} ${r.ms}ms — ${r.providerLabel} / ${fn}${r.path} — ${r.detail}`);
  }
  const tested = results.filter((r) => !r.skipped);
  const failed = tested.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped);
  console.log(
    `\nTotal: ${results.length} | Pass: ${tested.length - failed.length} | Fail: ${failed.length} | Skipped: ${skipped.length}`
  );
  return failed.length;
}
