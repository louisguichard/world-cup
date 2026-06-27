import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createMatchSlice, type MatchSliceState } from "./slices/matchSlice";
import { createFootballPredictionSlice, type FootballPredictionSliceState } from "./slices/footballPredictionSlice";
import { createWorldCupHistorySlice, type WorldCupHistorySliceState } from "./slices/worldCupHistorySlice";
import { createNavigationSlice, type NavigationSliceState } from "./slices/navigationSlice";
import { createSimulationSlice, type SimulationSliceState } from "./slices/simulationSlice";
import { createTeamProfileSlice, type TeamProfileSliceState } from "./slices/teamProfileSlice";
import { createTournamentSlice, type TournamentSliceState } from "./slices/tournamentSlice";
import { createUiSlice, type UiSliceState } from "./slices/uiSlice";

export type AppStore = MatchSliceState &
  TournamentSliceState &
  SimulationSliceState &
  UiSliceState &
  NavigationSliceState &
  TeamProfileSliceState &
  FootballPredictionSliceState &
  WorldCupHistorySliceState;

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
      ...createUiSlice((fn) => set((state) => fn(state as UiSliceState))),
      ...createNavigationSlice((fn) => set((state) => fn(state as NavigationSliceState))),
      ...createTeamProfileSlice((fn) => set((state) => fn(state as TeamProfileSliceState))),
      ...createFootballPredictionSlice(
        (fn) => set((state) => fn(state as FootballPredictionSliceState)),
        () => get() as FootballPredictionSliceState & { teams: Record<string, import("../types").Team> }
      ),
      ...createWorldCupHistorySlice(
        (fn) => set((state) => fn(state as WorldCupHistorySliceState)),
        () => get() as WorldCupHistorySliceState
      )
    }),
    { enabled: import.meta.env.DEV, name: "world-cup" }
  )
);
