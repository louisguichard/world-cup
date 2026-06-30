import { useEffect, useMemo, useState } from "react";
import { imageAssetService, ensurePaninarrCatalogLoaded } from "../services/paninarr/ImageAssetService";
import type { PaninarrSearchResult, PaninarrStickerCategory } from "../services/paninarr/types";

/** Debounced Paninarr sticker search over bundled index. */
export function usePaninarrSearch(
  query: string,
  opts?: { limit?: number; type?: PaninarrStickerCategory; minLength?: number }
): PaninarrSearchResult[] {
  const minLength = opts?.minLength ?? 2;
  const trimmed = query.trim();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensurePaninarrCatalogLoaded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (!ready || trimmed.length < minLength) return [];
    return imageAssetService.searchStickers(trimmed, {
      limit: opts?.limit,
      type: opts?.type,
    });
  }, [ready, trimmed, minLength, opts?.limit, opts?.type]);
}

/** Returns fraction of Paninarr precache URLs present in Cache Storage (production SW). */
export async function getPaninarrCacheProgress(): Promise<{ cached: number; total: number }> {
  const urls = imageAssetService.getPrecacheUrls();
  if (!("caches" in globalThis) || urls.length === 0) {
    return { cached: 0, total: urls.length };
  }

  let cached = 0;
  for (const url of urls) {
    const hit = await caches.match(url);
    if (hit) cached += 1;
  }
  return { cached, total: urls.length };
}
