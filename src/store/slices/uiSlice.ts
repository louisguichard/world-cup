import type { BracketViewMode, GroupsViewMode, SimulatorMode, SplashPhase, TabId } from "../../types";
import {
  readStoredColorScheme,
  writeStoredColorScheme,
  type ColorSchemePreference,
} from "../../lib/colorScheme";
import type { ModuleId } from "../../lib/moduleIds";

export type UiSliceState = {
  activeTab: TabId;
  simulatorMode: SimulatorMode;
  splashPhase: SplashPhase;
  splashProgress: number;
  splashMessage: string;
  primaryLiveMatchId: string | null;
  bracketViewMode: BracketViewMode;
  groupsViewMode: GroupsViewMode;
  activeTeamId: string | null;
  teamSheetOpen: boolean;
  colorScheme: ColorSchemePreference;
  moduleFreshness: Partial<Record<ModuleId, number>>;
  setActiveTab: (tab: TabId) => void;
  setSimulatorMode: (mode: SimulatorMode) => void;
  setSplashPhase: (phase: SplashPhase) => void;
  setSplashProgress: (progress: number, message?: string) => void;
  setPrimaryMatch: (matchId: string | null) => void;
  setBracketViewMode: (mode: BracketViewMode) => void;
  setGroupsViewMode: (mode: GroupsViewMode) => void;
  setColorScheme: (scheme: ColorSchemePreference) => void;
  openTeamSheet: (teamId: string) => void;
  closeTeamSheet: () => void;
  touchModuleFreshness: (moduleId: ModuleId) => void;
};

export const createUiSlice = (
  set: (fn: (state: UiSliceState) => Partial<UiSliceState>) => void
): UiSliceState => ({
  activeTab: "live",
  simulatorMode: "tournament",
  splashPhase: "loading",
  splashProgress: 0,
  splashMessage: "Connecting to live data...",
  primaryLiveMatchId: null,
  bracketViewMode: "projected",
  groupsViewMode: "flags",
  activeTeamId: null,
  teamSheetOpen: false,
  colorScheme: readStoredColorScheme(),
  moduleFreshness: {},

  setActiveTab: (tab) => set(() => ({ activeTab: tab })),
  setSimulatorMode: (mode) => set(() => ({ simulatorMode: mode })),
  setSplashPhase: (phase) => set(() => ({ splashPhase: phase })),
  setSplashProgress: (progress, message) =>
    set((state) => ({
      splashProgress: progress,
      splashMessage: message ?? state.splashMessage
    })),
  setPrimaryMatch: (matchId) => set(() => ({ primaryLiveMatchId: matchId })),
  setBracketViewMode: (mode) => set(() => ({ bracketViewMode: mode })),
  setGroupsViewMode: (mode) => set(() => ({ groupsViewMode: mode })),
  setColorScheme: (scheme) => {
    writeStoredColorScheme(scheme);
    set(() => ({ colorScheme: scheme }));
  },
  openTeamSheet: (teamId) => set(() => ({ activeTeamId: teamId, teamSheetOpen: true })),
  closeTeamSheet: () => set(() => ({ teamSheetOpen: false })),
  touchModuleFreshness: (moduleId) =>
    set((state) => ({
      moduleFreshness: { ...state.moduleFreshness, [moduleId]: Date.now() },
    })),
});
