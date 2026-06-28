export type MatchOverride = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  note?: string;
};

export type ScenarioStatus = "idle" | "computing" | "ready" | "error";

export type ScenarioResult = {
  scenarioId: string;
  seed: number;
  iterationsRun: number;
  advancementProbabilities: Record<string, number>;
  completedAt: string;
};

export type ScenarioSliceState = {
  activeScenarioId: string | null;
  overrides: MatchOverride[];
  result: ScenarioResult | null;
  status: ScenarioStatus;
  baselineSnapshotId: string | null;
  errorMessage: string | null;
  setActiveScenario: (id: string | null, baselineSnapshotId?: string) => void;
  addOverride: (override: MatchOverride) => void;
  removeOverride: (matchId: string) => void;
  clearOverrides: () => void;
  setScenarioStatus: (status: ScenarioStatus, errorMessage?: string) => void;
  setScenarioResult: (result: ScenarioResult | null) => void;
};

export const createScenarioSlice = (
  set: (fn: (state: ScenarioSliceState) => Partial<ScenarioSliceState>) => void
): ScenarioSliceState => ({
  activeScenarioId: null,
  overrides: [],
  result: null,
  status: "idle",
  baselineSnapshotId: null,
  errorMessage: null,

  setActiveScenario: (id, baselineSnapshotId) =>
    set(() => ({
      activeScenarioId: id,
      baselineSnapshotId: baselineSnapshotId ?? null,
      overrides: [],
      result: null,
      status: "idle",
      errorMessage: null,
    })),

  addOverride: (override) =>
    set((state) => {
      const rest = state.overrides.filter((o) => o.matchId !== override.matchId);
      return { overrides: [...rest, override], status: "idle", result: null };
    }),

  removeOverride: (matchId) =>
    set((state) => ({
      overrides: state.overrides.filter((o) => o.matchId !== matchId),
      status: "idle",
      result: null,
    })),

  clearOverrides: () =>
    set(() => ({ overrides: [], result: null, status: "idle" })),

  setScenarioStatus: (status, errorMessage) =>
    set(() => ({ status, errorMessage: errorMessage ?? null })),

  setScenarioResult: (result) =>
    set(() => ({ result, status: result ? "ready" : "idle" })),
});
