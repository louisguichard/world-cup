import type { MatchDetailTab, NavigationContext, TournamentSubTab } from "../../types";

const NAV_RETURN_KEY = "wc-nav-return";

export type NavigationSliceState = {
  activeMatchId: string | null;
  activeMatchTab: MatchDetailTab;
  activeVenueSlug: string | null;
  returnContext: NavigationContext | null;
  tournamentSubTab: TournamentSubTab;
  selectedDateKey: string | null;
  selectedBracketRound: string | null;
  openMatchDetail: (matchId: string, context?: NavigationContext) => void;
  closeMatchDetail: () => void;
  openVenueHub: (slug: string, context?: NavigationContext) => void;
  closeVenueHub: () => void;
  setMatchTab: (tab: MatchDetailTab) => void;
  setTournamentSubTab: (tab: TournamentSubTab) => void;
  setSelectedDateKey: (key: string | null) => void;
  setSelectedBracketRound: (round: string | null) => void;
};

export function saveReturnContext(ctx: NavigationContext): void {
  try {
    sessionStorage.setItem(NAV_RETURN_KEY, JSON.stringify(ctx));
  } catch {
    // ignore storage errors
  }
}

export function loadReturnContext(): NavigationContext | null {
  try {
    const raw = sessionStorage.getItem(NAV_RETURN_KEY);
    return raw ? (JSON.parse(raw) as NavigationContext) : null;
  } catch {
    return null;
  }
}

export function clearReturnContext(): void {
  try {
    sessionStorage.removeItem(NAV_RETURN_KEY);
  } catch {
    // ignore
  }
}

export const createNavigationSlice = (
  set: (fn: (state: NavigationSliceState) => Partial<NavigationSliceState>) => void
): NavigationSliceState => ({
  activeMatchId: null,
  activeMatchTab: "summary",
  activeVenueSlug: null,
  returnContext: null,
  tournamentSubTab: "matches",
  selectedDateKey: null,
  selectedBracketRound: null,

  openMatchDetail: (matchId, context) => {
    if (context) saveReturnContext(context);
    set(() => ({
      activeMatchId: matchId,
      activeMatchTab: "summary",
      returnContext: context ?? null
    }));
  },

  closeMatchDetail: () => {
    set(() => ({ activeMatchId: null, activeMatchTab: "summary" }));
  },

  openVenueHub: (slug, context) => {
    if (context) saveReturnContext(context);
    set(() => ({
      activeVenueSlug: slug,
      returnContext: context ?? null
    }));
  },

  closeVenueHub: () => {
    set(() => ({ activeVenueSlug: null }));
  },

  setMatchTab: (tab) => set(() => ({ activeMatchTab: tab })),

  setTournamentSubTab: (tab) => set(() => ({ tournamentSubTab: tab })),

  setSelectedDateKey: (key) => set(() => ({ selectedDateKey: key })),

  setSelectedBracketRound: (round) => set(() => ({ selectedBracketRound: round }))
});
