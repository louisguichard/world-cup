import type { FootballPredictionBundle } from "../../types/footballPrediction";
import {
  loadCachedFootballPredictionBundle,
  syncFootballPredictionsIfNeeded,
} from "../../services/footballPrediction/FootballPredictionSync";

export type FootballPredictionSliceState = {
  footballPredictionBundle: FootballPredictionBundle | null;
  footballPredictionSyncRunning: boolean;
  hydrateFootballPredictions: () => void;
  setFootballPredictionBundle: (bundle: FootballPredictionBundle) => void;
  startFootballPredictionSync: () => void;
};

export const createFootballPredictionSlice = (
  set: (fn: (state: FootballPredictionSliceState) => Partial<FootballPredictionSliceState>) => void,
  get: () => FootballPredictionSliceState & { teams: Record<string, import("../../types").Team> }
): FootballPredictionSliceState => ({
  footballPredictionBundle: null,
  footballPredictionSyncRunning: false,

  hydrateFootballPredictions: () =>
    set(() => ({
      footballPredictionBundle: loadCachedFootballPredictionBundle(),
    })),

  setFootballPredictionBundle: (bundle) =>
    set(() => ({
      footballPredictionBundle: bundle,
    })),

  startFootballPredictionSync: () => {
    set(() => ({ footballPredictionSyncRunning: true }));
    const teams = get().teams;
    void syncFootballPredictionsIfNeeded((bundle) => {
      set(() => ({ footballPredictionBundle: bundle }));
    }, teams).finally(() => {
      set(() => ({ footballPredictionSyncRunning: false }));
    });
  },
});
