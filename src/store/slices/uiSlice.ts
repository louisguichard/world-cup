import type { BracketLayoutMode, BracketViewMode, GroupsViewMode, SimulatorMode, SplashPhase, TabId } from "../../types";
import type { OpenTeamSheetOptions, TeamDrawerTab } from "../../lib/teamDrawer";
import { readInitialAppHash } from "../../lib/appHash";
import { readStoredBracketLayoutMode, writeStoredBracketLayoutMode } from "../../lib/bracketLayoutPreference";
import {
  readStoredColorScheme,
  writeStoredColorScheme,
  type ColorSchemePreference,
} from "../../lib/colorScheme";
import { readStoredFollowedTeamId, writeStoredFollowedTeamId } from "../../lib/followedTeamPreference";
import type { ModuleId } from "../../lib/moduleIds";

export type UiSliceState = {
  activeTab: TabId;
  simulatorMode: SimulatorMode;
  splashPhase: SplashPhase;
  splashProgress: number;
  splashMessage: string;
  primaryLiveMatchId: string | null;
  bracketViewMode: BracketViewMode;
  bracketLayoutMode: BracketLayoutMode;
  groupsViewMode: GroupsViewMode;
  activeTeamId: string | null;
  teamSheetOpen: boolean;
  teamSheetTab: TeamDrawerTab;
  colorScheme: ColorSchemePreference;
  followedTeamId: string | null;
  moduleFreshness: Partial<Record<ModuleId, number>>;
  setActiveTab: (tab: TabId) => void;
  setSimulatorMode: (mode: SimulatorMode) => void;
  setSplashPhase: (phase: SplashPhase) => void;
  setSplashProgress: (progress: number, message?: string) => void;
  setPrimaryMatch: (matchId: string | null) => void;
  setBracketViewMode: (mode: BracketViewMode) => void;
  setBracketLayoutMode: (mode: BracketLayoutMode) => void;
  setGroupsViewMode: (mode: GroupsViewMode) => void;
  setColorScheme: (scheme: ColorSchemePreference) => void;
  openTeamSheet: (teamId: string, options?: OpenTeamSheetOptions) => void;
  closeTeamSheet: () => void;
  setFollowedTeamId: (teamId: string | null) => void;
  toggleFollowedTeam: (teamId: string) => void;
  touchModuleFreshness: (moduleId: ModuleId) => void;
};

export const createUiSlice = (
  set: (fn: (state: UiSliceState) => Partial<UiSliceState>) => void
): UiSliceState => {
  const initialRoute = readInitialAppHash();
  return {
  activeTab: initialRoute.tab,
  simulatorMode: initialRoute.simulatorMode,
  splashPhase: "loading",
  splashProgress: 0,
  splashMessage: "Connecting to live data...",
  primaryLiveMatchId: null,
  bracketViewMode: "projected",
  bracketLayoutMode: readStoredBracketLayoutMode(),
  groupsViewMode: "flags",
  activeTeamId: null,
  teamSheetOpen: false,
  teamSheetTab: "overview",
  colorScheme: readStoredColorScheme(),
  followedTeamId: readStoredFollowedTeamId(),
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
  setBracketLayoutMode: (mode) => {
    writeStoredBracketLayoutMode(mode);
    set(() => ({ bracketLayoutMode: mode }));
  },
  setGroupsViewMode: (mode) => set(() => ({ groupsViewMode: mode })),
  setColorScheme: (scheme) => {
    writeStoredColorScheme(scheme);
    set(() => ({ colorScheme: scheme }));
  },
  openTeamSheet: (teamId, options) =>
    set(() => ({
      activeTeamId: teamId,
      teamSheetOpen: true,
      teamSheetTab: options?.tab ?? "overview",
    })),
  closeTeamSheet: () => set(() => ({ teamSheetOpen: false, teamSheetTab: "overview" })),
  setFollowedTeamId: (teamId) => {
    writeStoredFollowedTeamId(teamId);
    set(() => ({ followedTeamId: teamId }));
  },
  toggleFollowedTeam: (teamId) =>
    set((state) => {
      const next = state.followedTeamId === teamId ? null : teamId;
      writeStoredFollowedTeamId(next);
      return { followedTeamId: next };
    }),
  touchModuleFreshness: (moduleId) =>
    set((state) => ({
      moduleFreshness: { ...state.moduleFreshness, [moduleId]: Date.now() },
    })),
};
};
