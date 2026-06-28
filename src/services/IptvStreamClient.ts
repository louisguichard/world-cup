import { isApiEnabled } from "../config/apiFlags";
import {
  CLOUD_API_HUB_IPTV_HOST,
  FREE_DAILY_XTREAM_IPTV_HOST,
  IPTV_DEFAULT_COUNTRY_CODE,
  TVVIEW_IPTV_HOST,
  iptvStreamEndpoints,
} from "../config/iptvStreamEndpoints";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import type {
  IptvLiveChannel,
  IptvStreamLookupResult,
  IptvSubscriptionResult,
  XtreamServerCredentials,
} from "../types/iptvStream";
import type { LiveStreamServer } from "../types/liveStream";
import { acquireApiQuota, logApiQuotaBlock } from "./ApiQuotaGovernor";
import { logger } from "./Logger";

const XTREAM_HOST =
  providerByHost(FREE_DAILY_XTREAM_IPTV_HOST)?.host ?? FREE_DAILY_XTREAM_IPTV_HOST;
const CLOUD_HOST = providerByHost(CLOUD_API_HUB_IPTV_HOST)?.host ?? CLOUD_API_HUB_IPTV_HOST;
const TVVIEW_HOST = providerByHost(TVVIEW_IPTV_HOST)?.host ?? TVVIEW_IPTV_HOST;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let xtreamSessionDisabled = false;
let cloudSessionDisabled = false;
let tvViewSessionDisabled = false;

type CacheEntry<T> = { value: T; expiresAt: number };

let dailyXtreamCache: CacheEntry<XtreamServerCredentials[]> | null = null;
let subscriptionCache = new Map<string, CacheEntry<IptvSubscriptionResult>>();
let tvViewServersCache: CacheEntry<LiveStreamServer[]> | null = null;

export function isIptvXtreamDailyDisabled(): boolean {
  return xtreamSessionDisabled || !isApiEnabled("iptvXtreamDaily");
}

export function isIptvCloudSubscriberDisabled(): boolean {
  return cloudSessionDisabled || !isApiEnabled("iptvCloudSubscriber");
}

export function isIptvTvViewDisabled(): boolean {
  return tvViewSessionDisabled || !isApiEnabled("iptvTvView");
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

function normalizeTeamKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function baseUrl(host: "xtream" | "cloud" | "tvview"): string {
  if (typeof window === "undefined") {
    if (host === "xtream") return `https://${XTREAM_HOST}`;
    if (host === "cloud") return `https://${CLOUD_HOST}`;
    return `https://${TVVIEW_HOST}`;
  }
  if (host === "xtream") return "/api/free-daily-xtream-iptv";
  if (host === "cloud") return "/api/cloud-api-hub-iptv";
  return "/api/tvview";
}

function headers(host: string): HeadersInit {
  return rapidApiHeaders(host);
}

function buildXtreamBaseUrl(creds: XtreamServerCredentials): string {
  const protocol = creds.protocol ?? "http";
  const port = creds.port ? `:${creds.port}` : "";
  const host = creds.serverUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${protocol}://${host}${port}`;
}

export function buildXtreamM3uUrl(creds: XtreamServerCredentials): string {
  const base = buildXtreamBaseUrl(creds);
  return `${base}/get.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&type=m3u_plus&output=ts`;
}

export function buildXtreamLiveStreamUrl(
  creds: XtreamServerCredentials,
  streamId: string | number
): string {
  const base = buildXtreamBaseUrl(creds);
  return `${base}/live/${encodeURIComponent(creds.username)}/${encodeURIComponent(creds.password)}/${streamId}.m3u8`;
}

function normalizeXtreamCredentials(raw: unknown): XtreamServerCredentials[] {
  const results: XtreamServerCredentials[] = [];

  const push = (obj: Record<string, unknown>, name?: string) => {
    const serverUrl =
      pickString(obj, ["serverUrl", "server_url", "url", "host", "server", "domain"]) ??
      (isRecord(obj.server_info) ? pickString(obj.server_info, ["url"]) : undefined);
    const username =
      pickString(obj, ["username", "user", "login"]) ??
      (isRecord(obj.user_info) ? pickString(obj.user_info, ["username"]) : undefined);
    const password =
      pickString(obj, ["password", "pass", "pwd"]) ??
      (isRecord(obj.user_info) ? pickString(obj.user_info, ["password"]) : undefined);

    if (!serverUrl || !username || !password) return;

    const port =
      pickString(obj, ["port"]) ??
      (isRecord(obj.server_info) ? pickString(obj.server_info, ["port"]) : undefined);
    const protocolRaw =
      pickString(obj, ["protocol", "server_protocol"]) ??
      (isRecord(obj.server_info) ? pickString(obj.server_info, ["server_protocol"]) : undefined);

    results.push({
      serverUrl,
      username,
      password,
      port,
      protocol: protocolRaw === "https" ? "https" : "http",
      name: name ?? pickString(obj, ["name", "label", "title"]),
    });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isRecord(item)) push(item);
    }
    return results;
  }

  if (!isRecord(raw)) return results;

  if (typeof raw.message === "string" && !pickString(raw, ["url", "server"])) {
    return results;
  }

  if (isRecord(raw.user_info) && isRecord(raw.server_info)) {
    push({ ...raw.server_info, ...raw.user_info });
    return results;
  }

  for (const key of ["servers", "data", "results", "items", "list"]) {
    const val = raw[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isRecord(item)) push(item);
      }
      if (results.length > 0) return results;
    }
  }

  push(raw);
  return results;
}

function normalizeSubscription(
  raw: unknown,
  countryCode: string,
  plan: string
): IptvSubscriptionResult {
  const base: IptvSubscriptionResult = { countryCode, plan };

  if (!isRecord(raw)) return base;

  if (typeof raw.message === "string") {
    base.rawMessage = raw.message;
  }

  const m3uUrl = pickString(raw, [
    "m3u_url",
    "m3uUrl",
    "m3u",
    "playlist",
    "playlist_url",
    "playlistUrl",
    "url",
    "link",
  ]);

  const serverUrl = pickString(raw, ["server", "serverUrl", "server_url", "host", "url"]);
  const username = pickString(raw, ["username", "user", "login"]);
  const password = pickString(raw, ["password", "pass", "pwd"]);

  if (m3uUrl) base.m3uUrl = m3uUrl;

  if (serverUrl && username && password) {
    base.credentials = {
      serverUrl,
      username,
      password,
      port: pickString(raw, ["port"]),
      protocol: pickString(raw, ["protocol", "server_protocol"]) === "https" ? "https" : "http",
      name: `IPTV ${countryCode}`,
    };
    if (!base.m3uUrl) {
      base.m3uUrl = buildXtreamM3uUrl(base.credentials);
    }
  }

  return base;
}

function normalizeLiveChannel(raw: unknown, creds?: XtreamServerCredentials): IptvLiveChannel | null {
  if (!isRecord(raw)) return null;
  const streamIdRaw = raw.stream_id ?? raw.id ?? raw.streamId;
  if (streamIdRaw === undefined || streamIdRaw === null) return null;
  const streamId =
    typeof streamIdRaw === "string" || typeof streamIdRaw === "number" ? streamIdRaw : null;
  if (streamId === null) return null;
  const name = pickString(raw, ["name", "title", "stream_display_name"]) ?? `Channel ${String(streamId)}`;
  const category = pickString(raw, ["category_name", "category", "group"]);
  const directUrl = pickString(raw, ["stream_url", "url", "link"]);
  return {
    streamId: String(streamId),
    name,
    category,
    streamUrl: directUrl ?? (creds ? buildXtreamLiveStreamUrl(creds, streamId) : undefined),
  };
}

async function fetchJson<T>(
  host: "xtream" | "cloud" | "tvview",
  path: string,
  source: "iptvXtreamDaily" | "iptvCloudSubscriber" | "iptvTvView"
): Promise<T | null> {
  const disabled =
    host === "xtream"
      ? isIptvXtreamDailyDisabled()
      : host === "cloud"
        ? isIptvCloudSubscriberDisabled()
        : isIptvTvViewDisabled();
  if (disabled) return null;

  const quota = acquireApiQuota(source, "background");
  if (!quota.allowed) {
    logApiQuotaBlock(source, "background", quota);
    return null;
  }

  const rapidHost = host === "xtream" ? XTREAM_HOST : host === "cloud" ? CLOUD_HOST : TVVIEW_HOST;

  try {
    const res = await fetch(`${baseUrl(host)}${path}`, { headers: headers(rapidHost) });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (host === "xtream") xtreamSessionDisabled = true;
      else if (host === "cloud") cloudSessionDisabled = true;
      else tvViewSessionDisabled = true;
      logger.warn("IptvStream", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("IptvStream", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

/** RapidAPI — free daily Xtream server credentials */
export async function fetchDailyXtreamServers(): Promise<XtreamServerCredentials[]> {
  if (dailyXtreamCache && dailyXtreamCache.expiresAt > Date.now()) {
    return dailyXtreamCache.value;
  }

  const raw = await fetchJson<unknown>("xtream", iptvStreamEndpoints.dailyXtreamGet(), "iptvXtreamDaily");
  const creds = normalizeXtreamCredentials(raw);
  dailyXtreamCache = { value: creds, expiresAt: Date.now() + CACHE_TTL_MS };
  return creds;
}

/** RapidAPI — cloud auto-subscriber M3U / credentials */
export async function fetchIptvSubscription(
  countryCode: string = IPTV_DEFAULT_COUNTRY_CODE,
  plan = "1year_no_adults"
): Promise<IptvSubscriptionResult | null> {
  const cacheKey = `${plan}:${countryCode}`;
  const cached = subscriptionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const raw = await fetchJson<unknown>(
    "cloud",
    iptvStreamEndpoints.subscribeNoAdults({ countryCode, plan }),
    "iptvCloudSubscriber"
  );
  if (!raw) return null;

  const normalized = normalizeSubscription(raw, countryCode, plan);
  subscriptionCache.set(cacheKey, { value: normalized, expiresAt: Date.now() + CACHE_TTL_MS });
  return normalized;
}

function maybePushTvViewServer(list: LiveStreamServer[], value: unknown): void {
  if (!isRecord(value)) return;
  const baseName = pickString(value, ["name", "title", "channel", "channelName", "label"]);
  const explicitType = pickString(value, ["type", "format", "kind"]);

  const candidates: Array<{ key: string; label?: string }> = [
    { key: "url" },
    { key: "link" },
    { key: "m3u" },
    { key: "m3u_url", label: "M3U" },
    { key: "playlist", label: "M3U" },
    { key: "playlistUrl", label: "M3U" },
    { key: "stream_url", label: "HLS" },
    { key: "streamUrl", label: "HLS" },
    { key: "low", label: "low" },
    { key: "mid", label: "mid" },
    { key: "high", label: "high" },
    { key: "hd", label: "hd" },
  ];

  for (const candidate of candidates) {
    const raw = value[candidate.key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const url = raw.trim();
    list.push({
      name: candidate.label ? `${baseName ?? "TVView"} (${candidate.label})` : baseName,
      url,
      type: explicitType ?? (url.includes(".m3u") ? "m3u" : "hls"),
    });
  }
}

function normalizeTvViewServers(raw: unknown): LiveStreamServer[] {
  const out: LiveStreamServer[] = [];

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isRecord(node)) return;

    maybePushTvViewServer(out, node);
    for (const key of ["data", "items", "results", "streams", "channels", "list"]) {
      walk(node[key]);
    }
  };

  walk(raw);
  return out.filter((server, index, arr) => arr.findIndex((s) => s.url === server.url) === index);
}

/** RapidAPI — TVView /getAll index of IPTV stream links. */
export async function fetchTvViewServers(): Promise<LiveStreamServer[]> {
  if (tvViewServersCache && tvViewServersCache.expiresAt > Date.now()) {
    return tvViewServersCache.value;
  }

  const raw = await fetchJson<unknown>("tvview", iptvStreamEndpoints.tvViewGetAll(), "iptvTvView");
  const servers = normalizeTvViewServers(raw);
  tvViewServersCache = { value: servers, expiresAt: Date.now() + CACHE_TTL_MS };
  return servers;
}

/** Optional: pull live categories from Xtream player API (direct to IPTV server). */
export async function fetchXtreamLiveChannels(
  creds: XtreamServerCredentials
): Promise<IptvLiveChannel[]> {
  const base = buildXtreamBaseUrl(creds);
  const apiUrl = `${base}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&action=get_live_streams`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => normalizeLiveChannel(item, creds))
      .filter((c): c is IptvLiveChannel => c != null);
  } catch {
    return [];
  }
}

function channelMatchesFixture(channelName: string, home: string, away: string): boolean {
  const title = normalizeTeamKey(channelName);
  const h = normalizeTeamKey(home);
  const a = normalizeTeamKey(away);
  return (title.includes(h) && title.includes(a)) || title.includes(`${h} v ${a}`) || title.includes(`${h} vs ${a}`);
}

export function findIptvChannelsForFixture(
  channels: IptvLiveChannel[],
  homeTeamName: string,
  awayTeamName: string
): IptvLiveChannel[] {
  return channels.filter((c) => channelMatchesFixture(c.name, homeTeamName, awayTeamName));
}

function credentialsToServers(creds: XtreamServerCredentials[]): LiveStreamServer[] {
  return creds.map((c, i) => ({
    name: c.name ?? `Xtream server ${i + 1}`,
    url: buildXtreamM3uUrl(c),
    type: "m3u",
  }));
}

/** Resolve IPTV options for a fixture — enrichment / fallback, not canonical broadcast data. */
export async function resolveIptvStreamsForMatch(
  homeTeamName: string,
  awayTeamName: string,
  countryCode: string = IPTV_DEFAULT_COUNTRY_CODE
): Promise<IptvStreamLookupResult> {
  const sources: Array<"xtreamDaily" | "cloudSubscriber" | "tvview"> = [];
  const credentials: XtreamServerCredentials[] = [];
  const m3uUrls: string[] = [];
  const servers: LiveStreamServer[] = [];
  const channels: IptvLiveChannel[] = [];
  const errors: string[] = [];

  const [daily, subscription, tvViewServers] = await Promise.all([
    fetchDailyXtreamServers(),
    fetchIptvSubscription(countryCode),
    fetchTvViewServers(),
  ]);

  if (daily.length > 0) {
    sources.push("xtreamDaily");
    credentials.push(...daily);
    servers.push(...credentialsToServers(daily));
    for (const url of daily.map(buildXtreamM3uUrl)) {
      if (!m3uUrls.includes(url)) m3uUrls.push(url);
    }
  }

  if (subscription) {
    if (subscription.rawMessage && !subscription.m3uUrl && !subscription.credentials) {
      errors.push(subscription.rawMessage);
    } else {
      sources.push("cloudSubscriber");
      if (subscription.m3uUrl) {
        m3uUrls.push(subscription.m3uUrl);
        servers.push({
          name: `IPTV playlist (${countryCode})`,
          url: subscription.m3uUrl,
          type: "m3u",
        });
      }
      if (subscription.credentials) {
        credentials.push(subscription.credentials);
        servers.push({
          name: subscription.credentials.name ?? `Subscriber (${countryCode})`,
          url: buildXtreamM3uUrl(subscription.credentials),
          type: "m3u",
        });
      }
    }
  }

  if (tvViewServers.length > 0) {
    sources.push("tvview");
    servers.push(...tvViewServers);
    for (const server of tvViewServers) {
      if (server.url.includes(".m3u") && !m3uUrls.includes(server.url)) {
        m3uUrls.push(server.url);
      }
    }
  }

  const primaryCreds = credentials[0];
  if (primaryCreds) {
    const liveChannels = await fetchXtreamLiveChannels(primaryCreds);
    const matched = findIptvChannelsForFixture(liveChannels, homeTeamName, awayTeamName);
    channels.push(...matched);
    for (const ch of matched) {
      if (ch.streamUrl) {
        servers.unshift({
          name: ch.name,
          url: ch.streamUrl,
          type: "hls",
        });
      }
    }
  }

  const available = servers.length > 0 || channels.some((c) => Boolean(c.streamUrl));

  return {
    available,
    sources,
    credentials,
    m3uUrls,
    channels,
    servers,
    error: errors.length > 0 ? errors.join("; ") : undefined,
    fetchedAt: Date.now(),
  };
}
