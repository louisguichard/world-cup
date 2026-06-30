import { useMemo } from "react";
import { getMatchSupplement } from "../store/slices/matchSupplementSlice";
import { useStore } from "../store";
import type { MergedMatch } from "../types";

/** Kamp/andrekamp supplement for a match (highlights URL, etc.). */
export function useMatchSupplement(match: Pick<MergedMatch, "id" | "matchId"> | null) {
  const supplements = useStore((s) => s.matchSupplements);

  return useMemo(() => {
    if (!match) return undefined;
    return getMatchSupplement({ matchSupplements: supplements }, match);
  }, [match, supplements, match?.id, match?.matchId]);
}
