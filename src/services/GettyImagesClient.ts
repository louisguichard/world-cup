import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders } from "../config/rapidApiCatalog";
import {
  GETTY_IMAGES_HOST,
  GETTY_IMAGES_RAPIDAPI_HOST_HEADER,
  gettyImagesEndpoints,
} from "../config/gettyImagesEndpoints";
import type { GettyEventAsset, GettyImageAsset, GettyImageRef, GettySearchResult } from "../types/gettyImages";
import { logger } from "./Logger";

const RAPIDAPI_HOST = GETTY_IMAGES_HOST;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let sessionDisabled = false;
let cachedAccessToken: string | undefined;
let accessTokenExpiresAt = 0;

const imageCache = new Map<string, { value: GettyImageRef | null; expiresAt: number }>();
const eventCache = new Map<string, { value: GettyEventAsset[]; expiresAt: number }>();

export function isGettyImagesDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("gettyImages");
}

export function resetGettyImagesSessionForTests(): void {
  sessionDisabled = false;
  cachedAccessToken = undefined;
  accessTokenExpiresAt = 0;
  imageCache.clear();
  eventCache.clear();
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/getty-images";
}

function headers(): HeadersInit {
  const base = rapidApiHeaders(GETTY_IMAGES_RAPIDAPI_HOST_HEADER) as Record<string, string>;
  base["x-rapidapi-host"] = GETTY_IMAGES_RAPIDAPI_HOST_HEADER;
  return base;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
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

function encodeForm(fields: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function gettyApiKey(): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GETTY_API_KEY) {
    return import.meta.env.VITE_GETTY_API_KEY;
  }
  return undefined;
}

function gettyApiSecret(): string | undefined {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GETTY_API_SECRET) {
    return import.meta.env.VITE_GETTY_API_SECRET;
  }
  return undefined;
}

function withCredentials(fields: Record<string, string | number | boolean | undefined | null>) {
  const next = { ...fields };
  const apiKey = gettyApiKey();
  const accessToken =
    cachedAccessToken && Date.now() < accessTokenExpiresAt
      ? cachedAccessToken
      : import.meta.env?.VITE_GETTY_ACCESS_TOKEN;

  if (apiKey && !next.apiKey) next.apiKey = apiKey;
  if (accessToken && !next.accessToken) next.accessToken = accessToken;
  return next;
}

async function postForm(path: string, fields: Record<string, string | number | boolean | undefined | null>): Promise<unknown | null> {
  if (isGettyImagesDisabled()) return null;
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: encodeForm(withCredentials(fields)),
    });
    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 502) {
      sessionDisabled = true;
      logger.warn("GettyImages", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logger.warn("GettyImages", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

export function pickGettyDisplayUrl(image: GettyImageAsset): string | undefined {
  if (image.displayUrl) return image.displayUrl;
  const sizes = image.displaySizes ?? [];
  const byName = (name: string) => sizes.find((s) => s.name?.toLowerCase() === name)?.uri;
  return (
    image.previewUrl ??
    image.thumbUrl ??
    byName("comp") ??
    byName("preview") ??
    byName("thumb") ??
    sizes[0]?.uri
  );
}

export function normalizeGettyImage(raw: unknown): GettyImageAsset | null {
  if (!isRecord(raw)) return null;
  const displaySizesRaw = unwrapList(raw.display_sizes ?? raw.displaySizes, []);
  const displaySizes = displaySizesRaw
    .map((item) => {
      if (!isRecord(item)) return null;
      return {
        name: pickString(item, ["name"]),
        uri: pickString(item, ["uri", "url"]),
        isWatermarked: item.is_watermarked === true || item.isWatermarked === true,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const asset: GettyImageAsset = {
    id: pickField(raw, ["id", "image_id", "imageId"]) as string | number | undefined,
    title: pickString(raw, ["title", "name"]),
    caption: pickString(raw, ["caption", "description"]),
    artist: pickString(raw, ["artist", "artist_name"]),
    collectionName: pickString(raw, ["collection_name", "collectionName"]),
    displaySizes,
    thumbUrl: displaySizes.find((s) => s.name === "thumb")?.uri,
    previewUrl: displaySizes.find((s) => s.name === "preview" || s.name === "comp")?.uri,
    raw,
  };
  asset.displayUrl = pickGettyDisplayUrl(asset);
  if (!asset.displayUrl && !asset.id) return null;
  return asset;
}

export function normalizeGettyEvent(raw: unknown): GettyEventAsset | null {
  if (!isRecord(raw)) return null;
  const name = pickString(raw, ["name", "title", "event_name"]);
  if (!name) return null;
  return {
    id: pickField(raw, ["id", "event_id", "eventId"]) as string | number | undefined,
    name,
    startDate: pickString(raw, ["start_date", "startDate"]),
    endDate: pickString(raw, ["end_date", "endDate"]),
    editorialSegment: pickString(raw, ["editorial_segment", "editorialSegment"]),
    raw,
  };
}

export function normalizeGettyImageList(raw: unknown): GettySearchResult<GettyImageAsset> {
  const images = unwrapList(raw, ["images", "data", "results", "items"])
    .map((item) => normalizeGettyImage(item))
    .filter((img): img is GettyImageAsset => img != null);

  const resultCount = isRecord(raw)
    ? num(pickField(raw, ["result_count", "resultCount", "total"]))
    : undefined;

  return { resultCount, items: images, raw };
}

export function normalizeGettyEventList(raw: unknown): GettySearchResult<GettyEventAsset> {
  const events = unwrapList(raw, ["events", "data", "results", "items"])
    .map((item) => normalizeGettyEvent(item))
    .filter((evt): evt is GettyEventAsset => evt != null);

  const resultCount = isRecord(raw)
    ? num(pickField(raw, ["result_count", "resultCount", "total"]))
    : undefined;

  return { resultCount, items: events, raw };
}

export function toGettyImageRef(image: GettyImageAsset): GettyImageRef | null {
  const url = pickGettyDisplayUrl(image);
  if (!url) return null;
  return {
    id: image.id,
    url,
    title: image.title,
    caption: image.caption,
    credit: "Getty Images",
  };
}

function cacheGettyImage(key: string, value: GettyImageRef | null): GettyImageRef | null {
  imageCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function getCachedGettyImage(key: string): GettyImageRef | null | undefined {
  const entry = imageCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    imageCache.delete(key);
    return undefined;
  }
  return entry.value;
}

export async function getGettyAccessToken(): Promise<string | null> {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) return cachedAccessToken;

  const apiSecret = gettyApiSecret();
  const raw = await postForm(gettyImagesEndpoints.getAccessToken(), {
    apiKey: gettyApiKey(),
    apiSecret,
  });

  if (!isRecord(raw)) return null;
  const token = pickString(raw, ["access_token", "accessToken", "token"]);
  if (!token) return null;

  cachedAccessToken = token;
  const expiresIn = num(pickField(raw, ["expires_in", "expiresIn"])) ?? 1800;
  accessTokenExpiresAt = Date.now() + expiresIn * 1000 - 30_000;
  return token;
}

export async function fetchGettyEditorialImagesBySearchQuery(input: {
  phrase: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  editorialSegments?: string;
}): Promise<GettySearchResult<GettyImageAsset>> {
  const raw = await postForm(gettyImagesEndpoints.getEditorialImagesBySearchQuery(), {
    phrase: input.phrase,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 5,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    editorialSegments: input.editorialSegments ?? "sport",
  });
  return normalizeGettyImageList(raw);
}

export async function fetchGettyImagesBySearchQuery(input: {
  phrase: string;
  page?: number;
  pageSize?: number;
}): Promise<GettySearchResult<GettyImageAsset>> {
  const raw = await postForm(gettyImagesEndpoints.getImagesBySearchQuery(), {
    phrase: input.phrase,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 5,
  });
  return normalizeGettyImageList(raw);
}

export async function fetchGettyCreativeImagesBySearchQuery(input: {
  phrase: string;
  page?: number;
  pageSize?: number;
}): Promise<GettySearchResult<GettyImageAsset>> {
  const raw = await postForm(gettyImagesEndpoints.getCreativeImagesBySearchQuery(), {
    phrase: input.phrase,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 5,
  });
  return normalizeGettyImageList(raw);
}

export async function fetchGettyEventsBySearchQuery(input: {
  phrase: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  editorialSegment?: string;
}): Promise<GettySearchResult<GettyEventAsset>> {
  const raw = await postForm(gettyImagesEndpoints.getEventsBySearchQuery(), {
    phrase: input.phrase,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 10,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    editorialSegment: input.editorialSegment ?? "sport",
  });
  return normalizeGettyEventList(raw);
}

export async function fetchGettyPreviousPurchases(input?: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getPreviousPurchases(), {
    page: input?.page ?? 1,
    pageSize: input?.pageSize ?? 10,
    dateFrom: input?.dateFrom,
    dateTo: input?.dateTo,
  });
}

export async function fetchGettyImage(imageId: string | number): Promise<GettyImageAsset | null> {
  const raw = await postForm(gettyImagesEndpoints.getImage(), { imageId });
  return normalizeGettyImage(isRecord(raw) ? (raw.data ?? raw.image ?? raw) : raw);
}

export async function fetchGettyImages(imageIds: Array<string | number>): Promise<GettyImageAsset[]> {
  const raw = await postForm(gettyImagesEndpoints.getImages(), { imageIds: imageIds.join(",") });
  return normalizeGettyImageList(raw).items;
}

export async function fetchGettyEvent(eventId: string | number): Promise<GettyEventAsset | null> {
  const raw = await postForm(gettyImagesEndpoints.getEvent(), { eventId });
  return normalizeGettyEvent(isRecord(raw) ? (raw.data ?? raw.event ?? raw) : raw);
}

export async function fetchGettyCountriesList(): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getCountriesList(), {});
}

export async function fetchGettyPreviousDownloads(input?: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getPreviousDownloadsInfo(), {
    page: input?.page ?? 1,
    pageSize: input?.pageSize ?? 10,
    dateFrom: input?.dateFrom,
    dateTo: input?.dateTo,
  });
}

export async function fetchGettyVideoBySearchQuery(input: {
  phrase: string;
  page?: number;
  pageSize?: number;
}): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getVideoBySearchQuery(), {
    phrase: input.phrase,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 5,
  });
}

export async function fetchGettyProducts(): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getProducts(), {});
}

export async function fetchGettyBoards(): Promise<unknown | null> {
  return postForm(gettyImagesEndpoints.getBoards(), { page: 1, pageSize: 10 });
}

export async function lookupGettyEditorialImage(phrase: string): Promise<GettyImageRef | null> {
  const key = phrase.trim().toLowerCase();
  if (!key) return null;

  const cached = getCachedGettyImage(key);
  if (cached !== undefined) return cached;

  const result = await fetchGettyEditorialImagesBySearchQuery({ phrase, pageSize: 3 });
  const ref = result.items[0] ? toGettyImageRef(result.items[0]) : null;
  return cacheGettyImage(key, ref);
}

export async function prefetchGettyEditorialImage(phrase: string): Promise<void> {
  void lookupGettyEditorialImage(phrase);
}

export async function lookupGettyWorldCupEvents(phrase = "FIFA World Cup 2026"): Promise<GettyEventAsset[]> {
  const key = `events:${phrase.trim().toLowerCase()}`;
  const cached = eventCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const result = await fetchGettyEventsBySearchQuery({ phrase, pageSize: 12 });
  eventCache.set(key, { value: result.items, expiresAt: Date.now() + CACHE_TTL_MS });
  return result.items;
}
