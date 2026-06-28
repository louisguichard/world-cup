export type AdvancementProbability = {
  teamId: string;
  stage: string;
  probability: number;
  modelVersion: string;
  updatedAt: number;
};

export type MatchPredictionEntry = {
  matchId: string;
  homeWinP: number;
  drawP: number;
  awayWinP: number;
  modelVersion: string;
  updatedAt: number;
};

export type PredictionSliceState = {
  advancementProbabilities: Record<string, AdvancementProbability>;
  matchPredictions: Record<string, MatchPredictionEntry>;
  modelVersion: string;
  lastCalibrated: string | null;
  applyPredictionUpdate: (entry: AdvancementProbability | MatchPredictionEntry) => void;
  setModelVersion: (version: string) => void;
};

export const createPredictionSlice = (
  set: (fn: (state: PredictionSliceState) => Partial<PredictionSliceState>) => void
): PredictionSliceState => ({
  advancementProbabilities: {},
  matchPredictions: {},
  modelVersion: "1.0.0",
  lastCalibrated: null,

  applyPredictionUpdate: (entry) =>
    set((state) => {
      if ("stage" in entry) {
        return {
          advancementProbabilities: {
            ...state.advancementProbabilities,
            [`${entry.teamId}:${entry.stage}`]: entry,
          },
        };
      }
      return {
        matchPredictions: {
          ...state.matchPredictions,
          [entry.matchId]: entry,
        },
      };
    }),

  setModelVersion: (version) =>
    set(() => ({ modelVersion: version, lastCalibrated: new Date().toISOString() })),
});
