import teamStickersBundled from "../../data/generated/paninarrTeamStickers.json";
import type {
  PaninarrCatalog,
  PaninarrImageAsset,
  PaninarrLegendRecord,
  PaninarrSearchEntry,
  PaninarrSearchResult,
  PaninarrStickerCategory,
  PaninarrTrophyId,
} from "./types";
import { resolveCanonicalTeamId, resolveTeamLogoByAbbrev } from "../../data/wc2026TeamCatalog";
import { playerNamesMatch } from "../playerProfile/normalizePlayerName";
import { lookupIconicPlayerPhoto } from "../iconicFootball/IconicFootballClient";
import { normalizePaninarrName } from "./normalizePaninarrName";

type SearchIndexFile = {
  version: number;
  syncedAt: string;
  entries: PaninarrSearchEntry[];
};

class ImageAssetService {
  private catalog: PaninarrCatalog | null = null;
  private searchEntries: PaninarrSearchEntry[] | null = null;
  private loading: Promise<void> | null = null;
  private playersByTeam: Map<string, Map<string, PaninarrCatalog["players"][number]>> | null = null;
  private managersByTeam: Map<string, PaninarrCatalog["managers"][number]> | null = null;
  private stadiumsBySlug: Map<string, PaninarrCatalog["stadiums"][number]> | null = null;
  private hostCitiesBySlug: Map<string, PaninarrCatalog["hostCities"][number]> | null = null;
  private legendsById: Map<string, PaninarrLegendRecord> | null = null;
  private trophiesById: Map<string, PaninarrCatalog["trophies"][number]> | null = null;

  private teamStickers: Record<string, string> = (
    teamStickersBundled as { teamStickers: Record<string, string> }
  ).teamStickers;

  private buildIndexes(data: PaninarrCatalog): void {
    this.catalog = data;
    this.playersByTeam = new Map();
    for (const player of data.players) {
      const bucket = this.playersByTeam.get(player.teamId) ?? new Map();
      bucket.set(player.normalizedName, player);
      this.playersByTeam.set(player.teamId, bucket);
    }
    this.managersByTeam = new Map(data.managers.map((m) => [m.teamId, m]));
    this.stadiumsBySlug = new Map(data.stadiums.map((s) => [s.slug, s]));
    this.hostCitiesBySlug = new Map(data.hostCities.map((c) => [c.slug, c]));
    this.legendsById = new Map(data.legends.map((l) => [l.legendId, l]));
    this.trophiesById = new Map(data.trophies.map((t) => [t.trophyId, t]));
  }

  private async ensureLoaded(): Promise<void> {
    if (this.catalog) return;
    if (!this.loading) {
      this.loading = (async () => {
        const [catalogMod, searchMod] = await Promise.all([
          import("../../data/generated/paninarrCatalog.json"),
          import("../../data/generated/paninarrSearchIndex.json"),
        ]);
        this.buildIndexes(catalogMod.default as PaninarrCatalog);
        this.searchEntries = (searchMod.default as SearchIndexFile).entries;
      })();
    }
    await this.loading;
  }

  /** Eager load for tests and venue resolution at first paint. */
  ensureLoadedSyncForTests(catalog: PaninarrCatalog, search: SearchIndexFile): void {
    this.buildIndexes(catalog);
    this.searchEntries = search.entries;
  }

  private toAsset(record: {
    imageUrl?: string;
    credit?: string;
    licenseShortName?: string;
    cropPosition?: string;
    source?: string;
  } | undefined): PaninarrImageAsset | undefined {
    if (!record?.imageUrl) return undefined;
    return {
      imageUrl: record.imageUrl,
      credit: record.credit,
      licenseShortName: record.licenseShortName,
      cropPosition: record.cropPosition,
      source: record.source,
    };
  }

  private resolveTeamId(teamId?: string): string | undefined {
    if (!teamId?.trim()) return undefined;
    return resolveCanonicalTeamId(teamId);
  }

  getTeamSticker(teamId: string): PaninarrImageAsset | undefined {
    const canonical = this.resolveTeamId(teamId);
    if (!canonical) return undefined;
    const url = this.teamStickers[canonical];
    return url ? { imageUrl: url } : undefined;
  }

  getTeamCrest(teamId: string): string | undefined {
    const canonical = this.resolveTeamId(teamId);
    if (!canonical) return undefined;
    return resolveTeamLogoByAbbrev(canonical.toUpperCase());
  }

  getPlayerHeadshot(params: { teamId?: string; playerName: string }): PaninarrImageAsset | undefined {
    if (!this.catalog || !this.playersByTeam) return undefined;
    const name = params.playerName?.trim();
    if (!name) return undefined;

    const canonicalTeam = this.resolveTeamId(params.teamId);

    if (canonicalTeam) {
      const bucket = this.playersByTeam.get(canonicalTeam);
      if (bucket) {
        const normalized = normalizePaninarrName(name);
        const direct = bucket.get(normalized);
        if (direct) return this.toAsset(direct);
        for (const player of bucket.values()) {
          if (playerNamesMatch(player.displayName, name)) return this.toAsset(player);
        }
      }
    }

    for (const bucket of this.playersByTeam.values()) {
      for (const player of bucket.values()) {
        if (playerNamesMatch(player.displayName, name)) return this.toAsset(player);
      }
    }

    return undefined;
  }

  async getPlayerHeadshotAsync(params: {
    teamId?: string;
    playerName: string;
  }): Promise<PaninarrImageAsset | undefined> {
    await this.ensureLoaded();
    return this.getPlayerHeadshot(params);
  }

  getManagerHeadshot(teamId: string): PaninarrImageAsset | undefined {
    if (!this.managersByTeam) return undefined;
    const canonical = this.resolveTeamId(teamId);
    if (!canonical) return undefined;
    return this.toAsset(this.managersByTeam.get(canonical));
  }

  async getManagerHeadshotAsync(teamId: string): Promise<PaninarrImageAsset | undefined> {
    await this.ensureLoaded();
    return this.getManagerHeadshot(teamId);
  }

  getStadiumHero(slug: string): PaninarrImageAsset | undefined {
    return this.toAsset(this.stadiumsBySlug?.get(slug));
  }

  async getStadiumHeroAsync(slug: string): Promise<PaninarrImageAsset | undefined> {
    await this.ensureLoaded();
    return this.getStadiumHero(slug);
  }

  getHostCityHero(slug: string): PaninarrImageAsset | undefined {
    return this.toAsset(this.hostCitiesBySlug?.get(slug));
  }

  async getHostCityHeroAsync(slug: string): Promise<PaninarrImageAsset | undefined> {
    await this.ensureLoaded();
    return this.getHostCityHero(slug);
  }

  getLegendImage(legendId: string): PaninarrImageAsset | undefined {
    const legend = this.legendsById?.get(legendId);
    const paninarr = this.toAsset(legend);
    if (paninarr?.imageUrl) return paninarr;

    if (legend?.name) {
      const iconicUrl = lookupIconicPlayerPhoto(legend.name);
      if (iconicUrl) {
        return { imageUrl: iconicUrl, source: "iconicfootball", licenseShortName: "IconicFootball" };
      }
    }

    return paninarr;
  }

  getTrophyImage(trophyId: PaninarrTrophyId): PaninarrImageAsset | undefined {
    return this.toAsset(this.trophiesById?.get(trophyId));
  }

  searchStickers(
    query: string,
    opts?: { limit?: number; type?: PaninarrStickerCategory }
  ): PaninarrSearchResult[] {
    if (!this.searchEntries) return [];
    const limit = opts?.limit ?? 20;
    const q = normalizePaninarrName(query);
    if (!q) return [];

    const tokens = q.split(" ").filter(Boolean);
    const scored: { entry: PaninarrSearchEntry; score: number }[] = [];

    for (const entry of this.searchEntries) {
      if (opts?.type && entry.type !== opts.type) continue;
      let score = 0;
      const labelNorm = normalizePaninarrName(entry.label);
      if (labelNorm === q) score += 100;
      else if (labelNorm.startsWith(q)) score += 50;
      else if (labelNorm.includes(q)) score += 25;

      for (const token of tokens) {
        if (entry.tokens.includes(token)) score += 10;
        if (labelNorm.includes(token)) score += 5;
      }

      if (score > 0) scored.push({ entry, score });
    }

    scored.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label));

    return scored.slice(0, limit).map(({ entry }) => ({
      id: entry.id,
      type: entry.type,
      label: entry.label,
      teamId: entry.teamId,
      imageUrl: entry.imageUrl,
    }));
  }

  async searchStickersAsync(
    query: string,
    opts?: { limit?: number; type?: PaninarrStickerCategory }
  ): Promise<PaninarrSearchResult[]> {
    await this.ensureLoaded();
    return this.searchStickers(query, opts);
  }

  getPrecacheUrls(): string[] {
    const stadiumUrls = this.catalog?.stadiums.map((s) => s.imageUrl).filter(Boolean) ?? [];
    return [...Object.values(this.teamStickers), ...stadiumUrls];
  }

  warmCatalog(): Promise<void> {
    return this.ensureLoaded();
  }
}

export const imageAssetService = new ImageAssetService();

/** Load full catalog for venue heroes and player lookups. */
export function ensurePaninarrCatalogLoaded(): Promise<void> {
  return imageAssetService.warmCatalog();
}
