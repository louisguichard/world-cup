import type { MergedMatch, Team } from "../types";
import { mergeCanonicalLockedKnockout } from "./canonicalKnockoutResults";
import { normalizeLiveMatchStoreWithRegistry } from "./registry";

/**
 * Normalize, dedupe, remap legacy M## keys, and overlay locked canonical knockout results.
 * Use before materialize, winner indexing, and after every liveMatches commit.
 */
export function prepareLiveMatchStore(
  store: Record<string, MergedMatch>,
  teams: Record<string, Team>
): Record<string, MergedMatch> {
  const withCanonical = mergeCanonicalLockedKnockout(store);
  return normalizeLiveMatchStoreWithRegistry(withCanonical, teams);
}
