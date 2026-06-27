import { buildAppHash } from "../hooks/useHashSync";
import { clearReturnContext } from "../store/slices/navigationSlice";
import { useStore } from "../store";
import type { TabId } from "../types";

/** Dismiss overlays and switch tabs — safe to call from any chrome control. */
export function navigateToTab(tab: TabId): void {
  const state = useStore.getState();
  const hadOverlay =
    state.activeMatchId != null ||
    state.activeVenueSlug != null ||
    state.teamSheetOpen;

  state.closeMatchDetail();
  state.closeVenueHub();
  state.closeTeamSheet();
  clearReturnContext();

  if (state.activeTab !== tab || hadOverlay) {
    state.setActiveTab(tab);
  }

  window.history.replaceState(null, "", buildAppHash(tab, state.simulatorMode));
}

/** Shortcut for the default landing tab (Live). */
export function navigateHome(): void {
  navigateToTab("live");
}
