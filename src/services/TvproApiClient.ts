import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  TVPRO_API_HOST,
  TVPRO_CHANNEL_MODS,
  TVPRO_RAPID_API_PARTNER,
  type TvproChannelMod,
  tvproApiEndpoints,
} from "../config/tvproApiEndpoints";
import type {
  TvproChannel,
  TvproChannelListResult,
  TvproChannelSearchInput,
  TvproTokenResult,
} from "../types/tvpro";
import { TtlCache } from "./cache/TtlCache";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(TVPRO_API_HOST)?.host ?? TVPRO_API_HOST;
const CHANNEL_CACHE_TTL_MS = 60 * 60_000;

let sessionDisabled = false;
const channelCache = new TtlCache<string, TvproChannelListResult>();

export function isTvproApiDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("tvproApi");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/tvpro-api";
}

function headers(contentType?: string): HeadersInit {
  const base = rapidApiHeaders(RAPIDAPI_HOST);
  if (!contentType) return base;
  return { ...base, "Content-Type": contentType };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return undefined;
}

function normalizeChannel(raw: unknown, mod?: TvproChannelMod): TvproChannel | null {
  if (!isRecord(raw)) return null;

  const id =
    pickString(raw, ["id", "channel_id", "channelId", "stream_id", "streamId"]) ??
    (raw.id != null ? String(raw.id) : undefined);
  const name =
    pickString(raw, ["name", "title", "channel_name", "channelName", "nombre"]) ??
    (typeof raw.name === "string" ? raw.name : undefined);

  if (!id && !name) return null;

  const streamUrl = pickString(raw, [
    "url",
    "stream_url",
    "streamUrl",
    "link",
    "m3u8",
    "hls",
    "source",
  ]);

  return {
    id: id ?? name!,
    name: name ?? `Channel ${id}`,
    logo: pickString(raw, ["logo", "icon", "image", "img", "thumbnail"]),
    streamUrl,
    category: pickString(raw, ["category", "genre", "type"]),
    group: pickString(raw, ["group", "group_title", "groupTitle", "package"]),
    mod,
  };
}

function unwrapChannelList(raw: unknown): { channels: unknown[]; error?: string } {
  if (Array.isArray(raw)) return { channels: raw };

  if (!isRecord(raw)) return { channels: [] };

  if (typeof raw.error === "string") return { channels: [], error: raw.error };
  if (typeof raw.message === "string" && raw.success === false) {
    return { channels: [], error: raw.message };
  }

  for (const key of ["data", "channels", "canales", "results", "items", "lista", "tv"]) {
    const val = raw[key];
    if (Array.isArray(val)) return { channels: val };
  }

  return { channels: [] };
}

function extractToken(raw: unknown): TvproTokenResult {
  if (!isRecord(raw)) {
    return { token: null, raw, error: "Empty token response" };
  }

  if (typeof raw.error === "string") {
    return { token: null, raw, error: raw.error };
  }

  const token =
    pickString(raw, ["token", "access_token", "accessToken", "auth", "jwt"]) ??
    (typeof raw.token === "string" ? raw.token : null);

  return { token, raw, error: token ? undefined : "Token missing from response" };
}

function buildAttribution(mod: TvproChannelMod, count: number, source: "get" | "post"): string {
  const when = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `TVPro API · mod=${mod} · ${count} channel${count === 1 ? "" : "s"} · ${source.toUpperCase()} · ${when}`;
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T | null; status: number }> {
  if (isTvproApiDisabled()) return { data: null, status: 0 };

  try {
    const res = await fetch(`${baseUrl()}${path}`, init);
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("TvproApi", `Blocked ${res.status} on ${path}`);
      return { data: null, status: res.status };
    }
    if (!res.ok) return { data: null, status: res.status };
    return { data: (await res.json()) as T, status: res.status };
  } catch (err) {
    logger.warn("TvproApi", `Fetch failed ${path}: ${String(err)}`);
    return { data: null, status: 0 };
  }
}

async function fetchForm<T>(path: string, body: Record<string, string>): Promise<T | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (value) params.set(key, value);
  }

  const { data } = await fetchJson<T>(path, {
    method: "POST",
    headers: headers("application/x-www-form-urlencoded"),
    body: params.toString(),
  });
  return data;
}

function readEnvCredentials(): { email?: string; password?: string } {
  const email =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_TVPRO_EMAIL &&
      String(import.meta.env.VITE_TVPRO_EMAIL)) ||
    undefined;
  const password =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_TVPRO_PASSWORD &&
      String(import.meta.env.VITE_TVPRO_PASSWORD)) ||
    undefined;
  return { email, password };
}

/** GET — list TV channels for a module (tv, vix, star). */
export async function fetchTvproChannels(
  mod: TvproChannelMod = "tv"
): Promise<TvproChannelListResult> {
  const cacheKey = `get:${mod}`;
  const cached = channelCache.get(cacheKey);
  if (cached) return cached;

  const path = tvproApiEndpoints.channels({ mod, RapidApi: TVPRO_RAPID_API_PARTNER });
  const { data, status } = await fetchJson<unknown>(path, { headers: headers() });
  const { channels: list, error } = unwrapChannelList(data);
  const channels = list
    .map((row) => normalizeChannel(row, mod))
    .filter((c): c is TvproChannel => c != null);

  const result: TvproChannelListResult = {
    mod,
    channels,
    source: "get",
    attribution: buildAttribution(mod, channels.length, "get"),
    fetchedAt: Date.now(),
    upstreamError:
      error ??
      (status === 403
        ? "Not subscribed to TVPro API on RapidAPI"
        : data == null && status !== 0
          ? `Upstream HTTP ${status}`
          : undefined),
  };

  if (channels.length > 0) channelCache.set(cacheKey, result, CHANNEL_CACHE_TTL_MS);
  return result;
}

/** POST — obtain session token (email + password). */
export async function fetchTvproToken(input?: {
  email?: string;
  password?: string;
}): Promise<TvproTokenResult> {
  const env = readEnvCredentials();
  const email = input?.email ?? env.email;
  const password = input?.password ?? env.password;

  if (!email || !password) {
    return {
      token: null,
      raw: null,
      error: "TVPro credentials missing — set VITE_TVPRO_EMAIL and VITE_TVPRO_PASSWORD",
    };
  }

  const raw = await fetchForm<unknown>(tvproApiEndpoints.token(), { email, password });
  return extractToken(raw);
}

/** POST — search channels with an authenticated token. */
export async function searchTvproChannels(
  input: TvproChannelSearchInput
): Promise<TvproChannelListResult> {
  const mod = input.mod ?? "tv";
  const cacheKey = `post:${mod}:${input.search ?? ""}:${input.token.slice(0, 12)}`;
  const cached = channelCache.get(cacheKey);
  if (cached) return cached;

  const raw = await fetchForm<unknown>(tvproApiEndpoints.channelSearch(), {
    token: input.token,
    mod,
    search: input.search ?? "",
  });

  const { channels: list, error } = unwrapChannelList(raw);
  const channels = list
    .map((row) => normalizeChannel(row, mod === "" ? undefined : mod))
    .filter((c): c is TvproChannel => c != null);

  const result: TvproChannelListResult = {
    mod: mod === "" ? "tv" : mod,
    channels,
    source: "post",
    attribution: buildAttribution(mod === "" ? "tv" : mod, channels.length, "post"),
    fetchedAt: Date.now(),
    upstreamError: error,
  };

  if (channels.length > 0) channelCache.set(cacheKey, result, CHANNEL_CACHE_TTL_MS);
  return result;
}

/** Fetch all documented mods (tv, vix, star) — 3 GET requests, cached. */
export async function fetchAllTvproChannelMods(): Promise<TvproChannelListResult[]> {
  const results: TvproChannelListResult[] = [];
  for (const mod of TVPRO_CHANNEL_MODS) {
    results.push(await fetchTvproChannels(mod));
  }
  return results;
}

/** Filter channels whose name matches a search term (case-insensitive). */
export function filterTvproChannels(channels: TvproChannel[], query: string): TvproChannel[] {
  const q = query.trim().toLowerCase();
  if (!q) return channels;
  return channels.filter((c) => c.name.toLowerCase().includes(q));
}

export { TVPRO_CHANNEL_MODS, TVPRO_RAPID_API_PARTNER };
