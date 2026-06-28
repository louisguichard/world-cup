// Increment this when team identity schema changes (e.g. canonical ID normalization)
// to bust stale dual-ID payloads.
/** Bump when boot payload shape changes (e.g. canonical team IDs, schedule sync). */
export const BOOT_CACHE_SCHEMA_VERSION = 6 as const;
export const BOOT_CACHE_VERSION = BOOT_CACHE_SCHEMA_VERSION;
