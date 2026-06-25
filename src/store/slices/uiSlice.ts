import type { BracketViewMode, SplashPhase, TabId } from "../../types";

export type UiSliceState = {
  activeTab: TabId;
  splashPhase: SplashPhase;
  splashProgress: number;
  splashMessage: string;
  primaryLiveMatchId: string | null;
  bracketViewMode: BracketViewMode;
  activeTeamId: string | null;
  teamSheetOpen: boolean;
  setActiveTab: (tab: TabId) => void;
  setSplashPhase: (phase: SplashPhase) => void;
  setSplashProgress: (progress: number, message?: string) => void;
  setPrimaryMatch: (matchId: string | null) => void;
  setBracketViewMode: (mode: BracketViewMode) => void;
  openTeamSheet: (teamId: string) => void;
  closeTeamSheet: () => void;
};

export const createUiSlice = (
  set: (fn: (state: UiSliceState) => Partial<UiSliceState>) => void
): UiSliceState => ({
  activeTab: "live",
  splashPhase: "loading",
  splashProgress: 0,
  splashMessage: "Connecting to live data...",
  primaryLiveMatchId: null,
  bracketViewMode: "projected",
  activeTeamId: null,
  teamSheetOpen: false,

  setActiveTab: (tab) => set(() => ({ activeTab: tab })),
  setSplashPhase: (phase) => set(() => ({ splashPhase: phase })),
  setSplashProgress: (progress, message) =>
    set((state) => ({
      splashProgress: progress,
      splashMessage: message ?? state.splashMessage
    })),
  setPrimaryMatch: (matchId) => set(() => ({ primaryLiveMatchId: matchId })),
  setBracketViewMode: (mode) => set(() => ({ bracketViewMode: mode })),
  openTeamSheet: (teamId) => set(() => ({ activeTeamId: teamId, teamSheetOpen: true })),
  closeTeamSheet: () => set(() => ({ teamSheetOpen: false }))
});
