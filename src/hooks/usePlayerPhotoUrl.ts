import { useEnrichedPlayerPhoto } from "./useEnrichedPlayerPhoto";

/** @deprecated Use useEnrichedPlayerPhoto — kept for legacy imports. */
export function usePlayerPhotoUrl(playerName: string, teamId?: string, playerId?: string) {
  return useEnrichedPlayerPhoto(playerName, teamId, playerId);
}
