import type { TournamentSimulationResult } from "../../types";

export type SimulationSliceState = {
  simulationResult: TournamentSimulationResult | null;
  simulationRunning: boolean;
  simulationSeed: number;
  setSimulationResult: (result: TournamentSimulationResult | null) => void;
  setSimulationRunning: (running: boolean) => void;
};

export const createSimulationSlice = (
  set: (fn: (state: SimulationSliceState) => Partial<SimulationSliceState>) => void
): SimulationSliceState => ({
  simulationResult: null,
  simulationRunning: false,
  simulationSeed: 2026,
  setSimulationResult: (result) => set(() => ({ simulationResult: result })),
  setSimulationRunning: (running) => set(() => ({ simulationRunning: running }))
});
