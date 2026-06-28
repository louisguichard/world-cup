import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { createMatchSlice, type MatchSliceState } from "./slices/matchSlice";
import { createFootballPredictionSlice, type FootballPredictionSliceState } from "./slices/footballPredictionSlice";
import { createFootApi7Slice, type FootApi7SliceState } from "./slices/footApi7Slice";
import { createWorldCupHistorySlice, type WorldCupHistorySliceState } from "./slices/worldCupHistorySlice";
import { createNavigationSlice, type NavigationSliceState } from "./slices/navigationSlice";
import { createSimulationSlice, type SimulationSliceState } from "./slices/simulationSlice";
import { createTeamProfileSlice, type TeamProfileSliceState } from "./slices/teamProfileSlice";
import { createTournamentSlice, type TournamentSliceState } from "./slices/tournamentSlice";
import { createUiSlice, type UiSliceState } from "./slices/uiSlice";

import { createOfficialSlice, type OfficialSliceState } from "./slices/officialSlice";
import { createPredictionSlice, type PredictionSliceState } from "./slices/predictionSlice";
import { createScenarioSlice, type ScenarioSliceState } from "./slices/scenarioSlice";

export type AppStore = MatchSliceState &
  TournamentSliceState &
  SimulationSliceState &
  UiSliceState &
  NavigationSliceState &
  TeamProfileSliceState &
  FootballPredictionSliceState &
  FootApi7SliceState &
  WorldCupHistorySliceState &
  OfficialSliceState &
  PredictionSliceState &
  ScenarioSliceState;

export const useStore = create<AppStore>()(
  devtools(
    (set, get) => ({
      ...createMatchSlice(
        (fn) => set((state) => fn(state as MatchSliceState)),
        () => get() as AppStore
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
      ...createFootApi7Slice((fn) => set((state) => fn(state as FootApi7SliceState))),
      ...createWorldCupHistorySlice(
        (fn) => set((state) => fn(state as WorldCupHistorySliceState)),
        () => get() as WorldCupHistorySliceState
      ),
      ...createOfficialSlice((fn) => set((state) => fn(state as OfficialSliceState))),
      ...createPredictionSlice((fn) => set((state) => fn(state as PredictionSliceState))),
      ...createScenarioSlice((fn) => set((state) => fn(state as ScenarioSliceState)))
    }),
    { enabled: import.meta.env.DEV, name: "world-cup" }
  )
);
