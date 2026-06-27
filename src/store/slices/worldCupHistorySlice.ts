import type { WorldCupHistoryBundle } from "../../types/worldCupHistory";
import {
  fetchWorldCupYearDetailIfNeeded,
  loadCachedWorldCupHistoryBundle,
  syncWorldCupHistoryIfNeeded,
} from "../../services/worldCupHistory/WorldCupHistorySync";

export type WorldCupHistorySliceState = {
  worldCupHistoryBundle: WorldCupHistoryBundle | null;
  worldCupHistorySyncRunning: boolean;
  hydrateWorldCupHistory: () => void;
  setWorldCupHistoryBundle: (bundle: WorldCupHistoryBundle) => void;
  startWorldCupHistorySync: () => void;
  loadWorldCupYearDetail: (year: number) => void;
};

export const createWorldCupHistorySlice = (
  set: (fn: (state: WorldCupHistorySliceState) => Partial<WorldCupHistorySliceState>) => void,
  get: () => WorldCupHistorySliceState
): WorldCupHistorySliceState => ({
  worldCupHistoryBundle: null,
  worldCupHistorySyncRunning: false,

  hydrateWorldCupHistory: () =>
    set(() => ({
      worldCupHistoryBundle: loadCachedWorldCupHistoryBundle(),
    })),

  setWorldCupHistoryBundle: (bundle) =>
    set(() => ({
      worldCupHistoryBundle: bundle,
    })),

  startWorldCupHistorySync: () => {
    set(() => ({ worldCupHistorySyncRunning: true }));
    void syncWorldCupHistoryIfNeeded((bundle) => {
      set(() => ({ worldCupHistoryBundle: bundle }));
    }).finally(() => {
      set(() => ({ worldCupHistorySyncRunning: false }));
    });
  },

  loadWorldCupYearDetail: (year) => {
    const current = get().worldCupHistoryBundle;
    void fetchWorldCupYearDetailIfNeeded(year, current).then((bundle) => {
      if (bundle) set(() => ({ worldCupHistoryBundle: bundle }));
    });
  },
});
