import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TIMEOUT_MS = 8_000;

export type RapidApiEndpoint = {
  id: string;
  fn: string;
  path: string;
  acceptStatuses?: number[];
  resolveKeys?: string[];
  skipIfUnresolved?: boolean;
};

export type RapidApiProvider = {
  id: string;
  label: string;
  host: string;
  marketplaceSlug: string;
  testPath: string;
  client: string;
  devProxyPrefix?: string;
  endpoints?: RapidApiEndpoint[];
};

export type RapidApiProbeResult = {
  providerId: string;
  label: string;
  endpointId: string;
  fn: string;
  host: string;
  path: string;
  url: string;
  ok: boolean;
  skipped?: boolean;
  status: number;
  latencyMs: number;
  detail: string;
  marketplaceUrl: string;
};

const catalogPath = join(__dirname, "../../../config/rapidapi-catalog.json");

export function loadRapidApiCatalog(): RapidApiProvider[] {
  const raw = readFileSync(catalogPath, "utf8");
  return JSON.parse(raw) as RapidApiProvider[];
}

export function rapidApiHeaders(key: string, host: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-rapidapi-key": key,
    "x-rapidapi-host": host,
  };
}

function todayYyyymmdd(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function interpolatePath(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const val = ctx[key];
    return val === undefined ? `{${key}}` : String(val);
  });
}

async function fetchJson(
  url: string,
  apiKey: string,
  host: string
): Promise<{ status: number; body: string; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: rapidApiHeaders(apiKey, host),
      signal: controller.signal,
    });
    const body = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(body) as unknown;
    } catch {
      json = null;
    }
    return { status: res.status, body, json };
  } finally {
    clearTimeout(timer);
  }
}

async function buildResolverContext(
  apiKey: string,
  catalog: RapidApiProvider[]
): Promise<Record<string, string>> {
  const ctx: Record<string, string> = {
    todayYyyymmdd: todayYyyymmdd(),
    todayIso: todayIso(),
    sampleMatchId: "M65",
  };

  const football = catalog.find((p) => p.id === "footballData");
  if (football) {
    const path = interpolatePath("/football-get-matches-by-date?date={todayYyyymmdd}", ctx);
    const { json } = await fetchJson(`https://${football.host}${path}`, apiKey, football.host);
    const response = json as { response?: { matches?: Array<{ home?: { id?: number } }> } };
    const homeId = response?.response?.matches?.[0]?.home?.id;
    if (homeId != null) ctx.footballTeamId = String(homeId);
  }

  const sport = catalog.find((p) => p.id === "sportApi7");
  if (sport) {
    const path = interpolatePath("/api/v1/category/1468/scheduled-events/{todayIso}", ctx);
    const { json } = await fetchJson(`https://${sport.host}${path}`, apiKey, sport.host);
    const events = (json as { events?: Array<{ id?: number }> })?.events;
    if (events?.[0]?.id != null) ctx.sportApiEventId = String(events[0].id);
  }

  const wcTeams = catalog.find((p) => p.id === "wc2026Teams");
  if (wcTeams) {
    const { json } = await fetchJson(`https://${wcTeams.host}/world-cup-2026/teams`, apiKey, wcTeams.host);
    const teams = (json as { teams?: Array<{ id?: string; abbreviation?: string }> })?.teams;
    const teamId = teams?.[0]?.id ?? teams?.[0]?.abbreviation;
    if (teamId != null) ctx.wc2026TeamId = encodeURIComponent(teamId);
  }

  const odds = catalog.find((p) => p.id === "oddsIntelligence");
  if (odds) {
    const { json } = await fetchJson(`https://${odds.host}/soccer/`, apiKey, odds.host);
    const eventId = (json as { data?: Array<{ id?: string }> })?.data?.[0]?.id;
    if (eventId != null) ctx.oddsEventId = eventId;
  }

  return ctx;
}

function evaluateStatus(
  status: number,
  acceptStatuses: number[],
  body: string
): { ok: boolean; detail: string } {
  if (status === 401 || status === 403) {
    return { ok: false, detail: `Auth/subscription issue — HTTP ${status}` };
  }
  if (status === 429) {
    return { ok: true, detail: "HTTP 429 — rate limited (key OK, retry later)" };
  }
  if (acceptStatuses.includes(status)) {
    if (status === 404) return { ok: true, detail: "HTTP 404 (no data — endpoint reachable)" };
    try {
      const parsed = JSON.parse(body) as unknown;
      if (Array.isArray(parsed)) return { ok: true, detail: `OK — ${parsed.length} items` };
      if (parsed && typeof parsed === "object") {
        return { ok: true, detail: `OK — ${Object.keys(parsed).slice(0, 5).join(", ")}` };
      }
    } catch {
      return { ok: true, detail: `OK — ${body.length} bytes` };
    }
    return { ok: true, detail: `HTTP ${status}` };
  }
  return { ok: false, detail: body.slice(0, 160) || `HTTP ${status}` };
}

async function probeEndpoint(
  provider: RapidApiProvider,
  endpoint: RapidApiEndpoint,
  apiKey: string,
  ctx: Record<string, string>
): Promise<RapidApiProbeResult> {
  const path = interpolatePath(endpoint.path, ctx);
  const marketplaceUrl = `https://rapidapi.com/${provider.marketplaceSlug}`;

  if (path.includes("{")) {
    if (endpoint.skipIfUnresolved) {
      return {
        providerId: provider.id,
        label: provider.label,
        endpointId: endpoint.id,
        fn: endpoint.fn,
        host: provider.host,
        path,
        url: "",
        ok: true,
        skipped: true,
        status: 0,
        latencyMs: 0,
        detail: "Skipped — no sample data to resolve dynamic path",
        marketplaceUrl,
      };
    }
    return {
      providerId: provider.id,
      label: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url: "",
      ok: false,
      skipped: false,
      status: 0,
      latencyMs: 0,
      detail: `Unresolved path: ${path}`,
      marketplaceUrl,
    };
  }

  const url = `https://${provider.host}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      headers: rapidApiHeaders(apiKey, provider.host),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    const body = await res.text();
    const acceptStatuses = endpoint.acceptStatuses ?? [200];
    const { ok, detail } = evaluateStatus(res.status, acceptStatuses, body);

    return {
      providerId: provider.id,
      label: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url,
      ok,
      status: res.status,
      latencyMs,
      detail,
      marketplaceUrl,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timed out after 8s"
          : err.message
        : "Unknown error";
    return {
      providerId: provider.id,
      label: provider.label,
      endpointId: endpoint.id,
      fn: endpoint.fn,
      host: provider.host,
      path,
      url,
      ok: false,
      status: 0,
      latencyMs,
      detail: msg,
      marketplaceUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** One smoke probe per hub. */
export async function testAllRapidApiHosts(apiKey: string): Promise<RapidApiProbeResult[]> {
  const catalog = loadRapidApiCatalog();
  const ctx = await buildResolverContext(apiKey, catalog);
  const results: RapidApiProbeResult[] = [];

  for (const provider of catalog) {
    const endpoint: RapidApiEndpoint = {
      id: "smoke",
      fn: "smoke",
      path: provider.testPath,
      acceptStatuses: provider.id === "wc2026Live" ? [200, 404] : [200],
    };
    results.push(await probeEndpoint(provider, endpoint, apiKey, ctx));
  }

  return results;
}

/** Every endpoint path from the catalog. */
export async function testAllRapidApiEndpoints(apiKey: string): Promise<{
  results: RapidApiProbeResult[];
  resolverContext: Record<string, string>;
}> {
  const catalog = loadRapidApiCatalog();
  const ctx = await buildResolverContext(apiKey, catalog);
  const results: RapidApiProbeResult[] = [];

  for (const provider of catalog) {
    for (const endpoint of provider.endpoints ?? []) {
      results.push(await probeEndpoint(provider, endpoint, apiKey, ctx));
    }
  }

  return { results, resolverContext: ctx };
}
