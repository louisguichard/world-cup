import { footballLogoSlugForAbbrev } from "./footballLogoSlugs";
import { playerNamesMatch, normalizePlayerName } from "../services/playerProfile/normalizePlayerName";

export interface PlayerRecord {
  name: string;
  shortName: string;
  nationality: string;
  position: string;
  club: string;
  age: number;
  goals: number;
  assists: number;
  appearances: number;
  rating: number;
  imageUrl?: string;
  slug?: string;
}

type SnapshotPlayer = PlayerRecord & { key: string };

type Snapshot = {
  version: number;
  syncedAt: string;
  players: SnapshotPlayer[];
  squads: Record<string, string[]>;
};

export const PLAYER_DATABASE_CACHE_KEY = "wc2026-static-players-v1";
export const PLAYER_DATABASE_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

const CSV_URL =
  "https://raw.githubusercontent.com/wamiqsnippets/FIFA-FOOTYCAST-26/master/data/players_data_cleaned.csv";
const SQUADS_URL =
  "https://raw.githubusercontent.com/abobabo91/wc2026-profiles/main/data/team_squads.json";
const PROFILE_BASE =
  "https://raw.githubusercontent.com/abobabo91/wc2026-profiles/main/data/players";

let playersByKey: Map<string, PlayerRecord> | null = null;
let playersBySlug: Map<string, PlayerRecord> | null = null;
let playersByLastName: Map<string, PlayerRecord[]> | null = null;
let squadsByNation: Record<string, string[]> | null = null;
let syncedAt: string | null = null;
let loading: Promise<void> | null = null;
const imageCache = new Map<string, string>();
const imageLoading = new Map<string, Promise<string | undefined>>();
const nameLookupCache = new Map<string, PlayerRecord | undefined>();

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickBetterPlayer(existing: PlayerRecord, candidate: PlayerRecord): PlayerRecord {
  if (candidate.rating > existing.rating) return { ...candidate, imageUrl: existing.imageUrl ?? candidate.imageUrl };
  if (candidate.rating === existing.rating && candidate.appearances > existing.appearances) {
    return { ...candidate, imageUrl: existing.imageUrl ?? candidate.imageUrl };
  }
  return existing;
}

function buildIndexes(data: Snapshot): void {
  const byKey = new Map<string, PlayerRecord>();
  const bySlug = new Map<string, PlayerRecord>();

  for (const row of data.players) {
    const { key, ...player } = row;
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickBetterPlayer(prev, player) : player);
    if (player.slug) {
      const slugPrev = bySlug.get(player.slug);
      bySlug.set(player.slug, slugPrev ? pickBetterPlayer(slugPrev, player) : player);
    }
  }

  const byLastName = new Map<string, PlayerRecord[]>();
  for (const player of byKey.values()) {
    const last = normalizePlayerName(player.name).split(" ").pop() ?? "";
    if (last.length < 3) continue;
    const bucket = byLastName.get(last) ?? [];
    bucket.push(player);
    byLastName.set(last, bucket);
  }

  playersByKey = byKey;
  playersBySlug = bySlug;
  playersByLastName = byLastName;
  squadsByNation = data.squads;
  syncedAt = data.syncedAt;
  nameLookupCache.clear();
}

async function loadBundledSnapshotAsync(): Promise<void> {
  const mod = await import("./generated/playerDatabase.json");
  buildIndexes(mod.default as Snapshot);
}

function readLocalStore(): Snapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYER_DATABASE_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.players)) return null;
    return parsed as Snapshot;
  } catch {
    return null;
  }
}

function writeLocalStore(data: Snapshot): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PLAYER_DATABASE_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function isSnapshotStale(at: string | null | undefined): boolean {
  if (!at) return true;
  const ts = Date.parse(at);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts >= PLAYER_DATABASE_REFRESH_MS;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function playerSlugFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].toLowerCase();
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(" ");
  return `${last}-${first}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortNameFromFull(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim();
  return `${parts[0]![0]}. ${parts[parts.length - 1]}`;
}

function parseNation(raw: string): string {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/);
  const code = parts[parts.length - 1]?.toUpperCase() ?? "";
  return code.length === 3 ? code : trimmed;
}

function toNumber(raw: string): number {
  const n = Number.parseFloat(raw.trim());
  return Number.isFinite(n) ? n : 0;
}

async function fetchRemoteSnapshot(): Promise<Snapshot | null> {
  try {
    const [csvRes, squadsRes] = await Promise.all([fetch(CSV_URL), fetch(SQUADS_URL)]);
    if (!csvRes.ok || !squadsRes.ok) return null;

    const csvText = await csvRes.text();
    const squads = (await squadsRes.json()) as Record<string, string[]>;
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return null;

    const headers = parseCsvLine(lines[0]!);
    const col = (name: string) => headers.indexOf(name);
    const idx = {
      player: col("Player"),
      nation: col("Nation"),
      pos: col("Pos"),
      squad: col("Squad"),
      age: col("Age"),
      gls: col("Gls"),
      ast: col("Ast"),
      mp: col("MP"),
      rating: col("MVP_Score"),
    };
    if (idx.player < 0) return null;

    const players: SnapshotPlayer[] = [];
    for (const line of lines.slice(1)) {
      const row = parseCsvLine(line);
      const name = row[idx.player]?.trim();
      if (!name) continue;
      const slug = playerSlugFromName(name);
      players.push({
        name,
        shortName: shortNameFromFull(name),
        nationality: parseNation(row[idx.nation] ?? ""),
        position: row[idx.pos]?.trim() ?? "",
        club: row[idx.squad]?.trim() ?? "",
        age: toNumber(row[idx.age] ?? "0"),
        goals: toNumber(row[idx.gls] ?? "0"),
        assists: toNumber(row[idx.ast] ?? "0"),
        appearances: toNumber(row[idx.mp] ?? "0"),
        rating: toNumber(row[idx.rating] ?? "0"),
        slug,
        key: normalizeKey(name),
      });
    }

    return {
      version: 1,
      syncedAt: new Date().toISOString(),
      players,
      squads,
    };
  } catch {
    return null;
  }
}

async function fetchAndBuild(): Promise<void> {
  if (!playersByKey) await loadBundledSnapshotAsync();

  if (typeof navigator !== "undefined" && navigator.onLine && isSnapshotStale(syncedAt)) {
    const remote = await fetchRemoteSnapshot();
    if (remote) {
      buildIndexes(remote);
      writeLocalStore(remote);
    }
  } else {
    const local = readLocalStore();
    if (local && (!syncedAt || Date.parse(local.syncedAt) > Date.parse(syncedAt))) {
      buildIndexes(local);
    }
  }
}

export function ensurePlayerDatabase(): Promise<void> {
  if (playersByKey) return Promise.resolve();
  if (loading) return loading;
  loading = fetchAndBuild().finally(() => {
    loading = null;
  });
  return loading;
}

function requireIndexes(): { byKey: Map<string, PlayerRecord>; bySlug: Map<string, PlayerRecord> } {
  if (!playersByKey || !playersBySlug) {
    throw new Error("Player database not loaded — call ensurePlayerDatabase() first");
  }
  return { byKey: playersByKey, bySlug: playersBySlug };
}

export function getPlayerByName(name: string): PlayerRecord | undefined {
  const cacheKey = normalizeKey(name);
  if (nameLookupCache.has(cacheKey)) {
    return nameLookupCache.get(cacheKey);
  }

  const { byKey, bySlug } = requireIndexes();
  const key = cacheKey;
  const exact = byKey.get(key);
  if (exact) {
    nameLookupCache.set(cacheKey, exact);
    return exact;
  }

  const slug = playerSlugFromName(name);
  const bySlugHit = bySlug.get(slug);
  if (bySlugHit && playerNamesMatch(bySlugHit.name, name)) {
    nameLookupCache.set(cacheKey, bySlugHit);
    return bySlugHit;
  }

  const parts = normalizePlayerName(name).split(" ");
  const last = parts[parts.length - 1];
  if (last && last.length >= 3 && playersByLastName) {
    const candidates = playersByLastName.get(last) ?? [];
    let best: PlayerRecord | undefined;
    for (const player of candidates) {
      if (playerNamesMatch(player.name, name)) {
        nameLookupCache.set(cacheKey, player);
        return player;
      }
      if (!best || player.rating > best.rating) best = player;
    }
    if (parts.length === 1 && best) {
      nameLookupCache.set(cacheKey, best);
      return best;
    }
  }

  nameLookupCache.set(cacheKey, undefined);
  return undefined;
}

export function nationSlugForTeamId(teamId: string): string | undefined {
  const abbrev = teamId.toUpperCase();
  return footballLogoSlugForAbbrev(abbrev);
}

export function getSquadByTeamId(teamId: string): PlayerRecord[] {
  const { bySlug } = requireIndexes();
  if (!squadsByNation) {
    throw new Error("Player database not loaded — call ensurePlayerDatabase() first");
  }
  const nationSlug = nationSlugForTeamId(teamId);
  if (!nationSlug) return [];

  const slugs = squadsByNation?.[nationSlug] ?? [];
  const squadPlayers: PlayerRecord[] = [];

  for (const slug of slugs) {
    const fromSlug = bySlug.get(slug);
    if (fromSlug) {
      squadPlayers.push(fromSlug);
    }
  }

  const deduped = new Map<string, PlayerRecord>();
  for (const p of squadPlayers) {
    const key = p.slug ?? normalizeKey(p.name);
    const prev = deduped.get(key);
    deduped.set(key, prev ? pickBetterPlayer(prev, p) : p);
  }

  return [...deduped.values()].sort((a, b) => b.rating - a.rating || b.appearances - a.appearances);
}

export function getPlayerPhotoUrlFromDatabase(playerName: string): string | undefined {
  const player = getPlayerByName(playerName);
  if (!player) return undefined;
  if (player.imageUrl) return player.imageUrl;
  if (player.slug && imageCache.has(player.slug)) return imageCache.get(player.slug);
  return undefined;
}

export async function hydratePlayerImage(slug: string): Promise<string | undefined> {
  if (imageCache.has(slug)) return imageCache.get(slug);
  const pending = imageLoading.get(slug);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`${PROFILE_BASE}/${slug}.json`);
      if (!res.ok) return undefined;
      const data: unknown = await res.json();
      if (!isRecord(data)) return undefined;
      const photo =
        (typeof data.photo === "string" && data.photo.trim()) ||
        (typeof data.imageUrl === "string" && data.imageUrl.trim()) ||
        undefined;
      if (photo) {
        imageCache.set(slug, photo);
        const { bySlug } = requireIndexes();
        const player = bySlug.get(slug);
        if (player) player.imageUrl = photo;
      }
      return photo;
    } catch {
      return undefined;
    } finally {
      imageLoading.delete(slug);
    }
  })();

  imageLoading.set(slug, promise);
  return promise;
}

export async function hydratePlayerImageFromDatabase(playerName: string): Promise<string | undefined> {
  await ensurePlayerDatabase();
  const cached = getPlayerPhotoUrlFromDatabase(playerName);
  if (cached) return cached;

  const player = getPlayerByName(playerName);
  if (!player?.slug) return undefined;
  return hydratePlayerImage(player.slug);
}

/** Reset in-memory indexes (tests only). */
export function resetPlayerDatabaseForTests(): void {
  playersByKey = null;
  playersBySlug = null;
  playersByLastName = null;
  squadsByNation = null;
  syncedAt = null;
  loading = null;
  imageCache.clear();
  imageLoading.clear();
  nameLookupCache.clear();
}
