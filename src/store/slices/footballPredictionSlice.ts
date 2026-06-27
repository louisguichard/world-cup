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
  set: (fn: (state: FootballPredictionSliceState) => Partial<FootballPredictionSliceState>) => void
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
    void syncFootballPredictionsIfNeeded((bundle) => {
      set(() => ({ footballPredictionBundle: bundle }));
    }).finally(() => {
      set(() => ({ footballPredictionSyncRunning: false }));
    });
  },
});
