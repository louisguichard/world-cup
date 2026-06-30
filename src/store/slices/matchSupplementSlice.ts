import type { MatchSupplement } from "../../types";
import type { AppStore } from "../index";

export type MatchSupplementSliceState = {
  matchSupplements: Record<string, MatchSupplement>;
  setMatchSupplement: (matchId: string, supplement: MatchSupplement) => void;
};

export const createMatchSupplementSlice = (
  set: (fn: (state: MatchSupplementSliceState) => Partial<MatchSupplementSliceState>) => void
): MatchSupplementSliceState => ({
  matchSupplements: {},

  setMatchSupplement: (matchId, supplement) =>
    set((state) => ({
      matchSupplements: { ...state.matchSupplements, [matchId]: supplement },
    })),
});

export function getMatchSupplement(
  state: Pick<MatchSupplementSliceState, "matchSupplements">,
  match: { id: string; matchId?: string }
): MatchSupplement | undefined {
  return (
    state.matchSupplements[match.id] ??
    (match.matchId ? state.matchSupplements[match.matchId] : undefined)
  );
}
