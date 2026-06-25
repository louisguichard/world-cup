import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createMatchSlice, type MatchSliceState } from "./slices/matchSlice";
import { createSimulationSlice, type SimulationSliceState } from "./slices/simulationSlice";
import { createTournamentSlice, type TournamentSliceState } from "./slices/tournamentSlice";
import { createUiSlice, type UiSliceState } from "./slices/uiSlice";

export type AppStore = MatchSliceState & TournamentSliceState & SimulationSliceState & UiSliceState;

export const useStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      ...createMatchSlice(
        (fn) => set((state) => fn(state as MatchSliceState)),
        () => get() as MatchSliceState
      ),
      ...createTournamentSlice(
        (fn) => set((state) => fn(state as TournamentSliceState)),
        () => get() as TournamentSliceState & { liveMatches: Record<string, import("../types").MergedMatch> }
      ),
      ...createSimulationSlice((fn) => set((state) => fn(state as SimulationSliceState))),
      ...createUiSlice((fn) => set((state) => fn(state as UiSliceState)))
    }),
    { enabled: import.meta.env.DEV, name: "world-cup" }
  )
);
