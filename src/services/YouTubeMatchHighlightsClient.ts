import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders } from "../config/rapidApiCatalog";
import {
  GOOGLE_API31_HOST,
  OFFICIAL_MATCH_VIDEO_CHANNELS,
  WEBSITE_SOCIAL_SCRAPER_HOST,
  YOUTUBE138_HOST,
  YOUTUBE_V2_HOST,
  googleApi31Endpoints,
  websiteSocialScraperEndpoints,
  youtube138Endpoints,
  youtubeV2Endpoints,
} from "../config/youtubeHighlightsEndpoints";
import type { MergedMatch, Team } from "../types";
import type { WebsiteContact, YouTubeMatchVideo, YouTubeRawCandidate } from "../types/youtubeHighlights";
import { logger } from "./Logger";
import { verifyYouTubeMatchVideo } from "./youtubeHighlights/verifyYouTubeMatchVideo";

type MatchVideoInput = {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  homeTeamName: string;
  awayTeamName: string;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const matchVideoCache = new Map<string, { expiresAt: number; videos: YouTubeMatchVideo[] }>();

let youtube138Disabled = false;
let googleApi31Disabled = false;
let socialScraperDisabled = false;

export function resetYouTubeMatchHighlightsSessionForTests(): void {
  youtube138Disabled = false;
  googleApi31Disabled = false;
  socialScraperDisabled = false;
  matchVideoCache.clear();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  return str(pickField(obj, keys));
}

function unwrapList(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];
  for (const key of keys) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function baseUrl(host: string): string {
  if (typeof window === "undefined") return `https://${host}`;
  if (host === YOUTUBE138_HOST) return "/api/youtube138";
  if (host === GOOGLE_API31_HOST) return "/api/google-api31";
  if (host === YOUTUBE_V2_HOST) return "/api/youtube-v2";
  return "/api/social-scraper";
}

function headers(host: string): HeadersInit {
  return rapidApiHeaders(host);
}

async function fetchJson(host: string, path: string, options?: RequestInit): Promise<unknown | null> {
  try {
    const res = await fetch(`${baseUrl(host)}${path}`, {
      ...options,
      headers: {
        ...headers(host),
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      if (host === YOUTUBE138_HOST) youtube138Disabled = true;
      if (host === GOOGLE_API31_HOST) googleApi31Disabled = true;
      if (host === WEBSITE_SOCIAL_SCRAPER_HOST) socialScraperDisabled = true;
      logger.warn("YouTubeHighlights", `Blocked ${res.status} from ${host}${path}`);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.warn("YouTubeHighlights", `Fetch failed ${host}${path}: ${String(err)}`);
    return null;
  }
}

function extractYouTubeVideoId(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  const direct = trimmed.match(/^[a-zA-Z0-9_-]{11}$/)?.[0];
  if (direct) return direct;

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").slice(0, 11) || undefined;
    }
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v") ?? undefined;
    const embed = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    return embed?.[1];
  } catch {
    const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1];
  }
  return undefined;
}

function normalizeThumbnail(raw: Record<string, unknown>): string | undefined {
  const direct = pickString(raw, ["thumbnail", "thumbnailUrl", "image", "imageUrl"]);
  if (direct) return direct;
  const thumbnails = raw.thumbnails;
  if (Array.isArray(thumbnails)) {
    for (let i = thumbnails.length - 1; i >= 0; i -= 1) {
      const item: unknown = thumbnails[i];
      if (isRecord(item) && typeof item.url === "string") return str(item.url);
    }
    return undefined;
  }
  if (isRecord(thumbnails)) {
    return pickString(thumbnails, ["url", "high", "medium", "default"]);
  }
  return undefined;
}

export function normalizeYouTube138Candidate(raw: unknown): YouTubeRawCandidate | null {
  if (!isRecord(raw)) return null;
  const video = isRecord(raw.video) ? raw.video : raw;
  const videoId =
    pickString(video, ["videoId", "video_id", "id"]) ??
    extractYouTubeVideoId(pickString(video, ["url", "watchUrl", "link"]));
  if (!videoId) return null;

  return {
    videoId,
    title: pickString(video, ["title", "name"]),
    description: pickString(video, ["description", "desc"]),
    channelId: pickString(video, ["channelId", "channel_id", "authorId"]),
    channelTitle: pickString(video, ["channelTitle", "channelName", "author", "authorName"]),
    publishedAt: pickString(video, ["publishedAt", "publishedTimeText", "published"]),
    thumbnailUrl: normalizeThumbnail(video),
    url: pickString(video, ["url", "watchUrl", "link"]) ?? `https://www.youtube.com/watch?v=${videoId}`,
    source: "youtube138",
  };
}

export function normalizeGoogleVideoCandidate(raw: unknown): YouTubeRawCandidate | null {
  if (!isRecord(raw)) return null;
  const url = pickString(raw, ["url", "link", "href"]);
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return {
    videoId,
    title: pickString(raw, ["title", "name"]),
    description: pickString(raw, ["description", "snippet", "body"]),
    channelTitle: pickString(raw, ["source", "publisher", "channel", "channelTitle"]),
    publishedAt: pickString(raw, ["date", "publishedAt"]),
    thumbnailUrl: normalizeThumbnail(raw),
    url,
    source: "google-api31",
  };
}

export function normalizeWebsiteContacts(raw: unknown): WebsiteContact[] {
  return unwrapList(raw, ["contacts", "data", "results", "items", "socials"])
    .map((item): WebsiteContact | null => {
      if (!isRecord(item)) return null;
      return {
        type: pickString(item, ["type", "platform", "name"]),
        label: pickString(item, ["label", "title", "name"]),
        url: pickString(item, ["url", "href", "link"]),
        raw: item,
      };
    })
    .filter((item): item is WebsiteContact => item != null);
}

function normalizeChannelVideos(raw: unknown): YouTubeRawCandidate[] {
  const list = unwrapList(raw, ["contents", "videos", "data", "items", "results"]);
  return list
    .map((item) => normalizeYouTube138Candidate(item))
    .filter((item): item is YouTubeRawCandidate => item != null);
}

function normalizeGoogleVideos(raw: unknown): YouTubeRawCandidate[] {
  const list = unwrapList(raw, ["results", "data", "items", "videos"]);
  return list
    .map((item) => normalizeGoogleVideoCandidate(item))
    .filter((item): item is YouTubeRawCandidate => item != null);
}

export async function fetchYouTube138ChannelVideos(channelId: string): Promise<YouTubeRawCandidate[]> {
  if (!isApiEnabled("youtubeMatchVideos") || youtube138Disabled) return [];
  const raw = await fetchJson(YOUTUBE138_HOST, youtube138Endpoints.channelVideos(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: channelId,
      filter: "videos_latest",
      cursor: "",
      hl: "en",
      gl: "US",
    }),
  });
  return normalizeChannelVideos(raw);
}

export async function fetchGoogleVideoSearch(text: string): Promise<YouTubeRawCandidate[]> {
  if (!isApiEnabled("youtubeMatchVideos") || googleApi31Disabled) return [];
  const raw = await fetchJson(GOOGLE_API31_HOST, googleApi31Endpoints.videoSearch(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      safesearch: "on",
      timelimit: "",
      duration: "",
      resolution: "",
      region: "us",
      max_results: 20,
    }),
  });
  return normalizeGoogleVideos(raw);
}

export async function fetchWebsiteContacts(website: string): Promise<WebsiteContact[]> {
  if (!isApiEnabled("youtubeMatchVideos") || socialScraperDisabled) return [];
  const raw = await fetchJson(
    WEBSITE_SOCIAL_SCRAPER_HOST,
    websiteSocialScraperEndpoints.contacts(website)
  );
  return normalizeWebsiteContacts(raw);
}

export function youtubeScreenshotUrl(videoId: string, timestampSeconds = 1200): string {
  if (typeof window === "undefined") {
    return `https://${YOUTUBE_V2_HOST}${youtubeV2Endpoints.videoScreenshot(videoId, timestampSeconds)}`;
  }
  return `/api/youtube-v2${youtubeV2Endpoints.videoScreenshot(videoId, timestampSeconds)}`;
}

function cacheKey(input: MatchVideoInput): string {
  return `${input.match.matchId ?? input.match.id}:${input.homeTeamName}:${input.awayTeamName}`;
}

function dedupeVideos(videos: YouTubeMatchVideo[]): YouTubeMatchVideo[] {
  const seen = new Set<string>();
  const out: YouTubeMatchVideo[] = [];
  for (const video of videos.sort((a, b) => b.confidence - a.confidence)) {
    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    out.push(video);
  }
  return out;
}

export async function resolveYouTubeMatchVideos(input: MatchVideoInput): Promise<YouTubeMatchVideo[]> {
  if (!isApiEnabled("youtubeMatchVideos")) return [];
  const key = cacheKey(input);
  const cached = matchVideoCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.videos;

  const channelCandidates = (
    await Promise.all(
      OFFICIAL_MATCH_VIDEO_CHANNELS.map(async (channel) => {
        const videos = await fetchYouTube138ChannelVideos(channel.id);
        return videos.map((video) => ({
          ...video,
          channelId: video.channelId ?? channel.id,
          channelTitle: video.channelTitle ?? channel.label,
        }));
      })
    )
  ).flat();

  const queryBase = `${input.homeTeamName} ${input.awayTeamName} World Cup`;
  const googleCandidates = (
    await Promise.all([
      fetchGoogleVideoSearch(`${queryBase} highlights FOX Soccer Telemundo Deportes YouTube`),
      fetchGoogleVideoSearch(`${queryBase} preview pre match FOX Soccer Telemundo Deportes YouTube`),
    ])
  ).flat();

  const verified = dedupeVideos(
    [...channelCandidates, ...googleCandidates]
      .map((candidate) => verifyYouTubeMatchVideo(candidate, input))
      .filter((video): video is YouTubeMatchVideo => video != null)
  ).slice(0, 4);

  matchVideoCache.set(key, { videos: verified, expiresAt: Date.now() + CACHE_TTL_MS });
  return verified;
}

