import type { MergedMatch, Team } from "../types";
import { mergeLiveMatchRecords } from "./dataFreshness";
import { prepareLiveMatchStore } from "./liveMatchStorePipeline";

export type CommitLiveMatchReason =
  | "boot-cache"
  | "boot-merge"
  | "boot-penalty-enrichment"
  | "boot-deferred"
  | "boot-fifa"
  | "poll"
  | "direct";

/**
 * Single merge path for liveMatches writes — normalizes incoming rows then applies
 * locked-row guards via mergeLiveMatchRecords (won't downgrade final locked results).
 */
export function commitLiveMatchStore(
  existing: Record<string, MergedMatch>,
  incoming: Record<string, MergedMatch>,
  teams: Record<string, Team>
): { merged: Record<string, MergedMatch>; changed: boolean } {
  const normalizedIncoming = prepareLiveMatchStore(incoming, teams);
  const { merged, changed } = mergeLiveMatchRecords(existing, normalizedIncoming);
  const prepared = prepareLiveMatchStore(merged, teams);
  const preparedChanged =
    changed ||
    Object.keys(prepared).length !== Object.keys(merged).length ||
    Object.keys(prepared).some((key) => prepared[key] !== merged[key]);

  return { merged: prepared, changed: preparedChanged };
}
