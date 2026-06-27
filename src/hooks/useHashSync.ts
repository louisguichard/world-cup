import { useEffect, useLayoutEffect, useRef } from "react";
import {
  buildAppHash,
  buildMatchHash,
  buildTournamentHash,
  buildVenueHash,
  parseAppHash,
  type ParsedAppHash,
} from "../lib/appHash";
import { logger } from "../services/Logger";
import { clearReturnContext, loadReturnContext } from "../store/slices/navigationSlice";
import { useStore } from "../store";
import type { NavigationContext } from "../types";

export type { ParsedAppHash };
export {
  buildAppHash,
  buildMatchHash,
  buildTournamentHash,
  buildVenueHash,
  parseAppHash,
} from "../lib/appHash";

export function useHashSync(): void {
  const activeTab = useStore((s) => s.activeTab);
  const simulatorMode = useStore((s) => s.simulatorMode);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const activeMatchTab = useStore((s) => s.activeMatchTab);
  const activeVenueSlug = useStore((s) => s.activeVenueSlug);
  const tournamentSubTab = useStore((s) => s.tournamentSubTab);
  const selectedDateKey = useStore((s) => s.selectedDateKey);

  const setActiveTab = useStore((s) => s.setActiveTab);
  const setSimulatorMode = useStore((s) => s.setSimulatorMode);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const closeMatchDetail = useStore((s) => s.closeMatchDetail);
  const openVenueHub = useStore((s) => s.openVenueHub);
  const closeVenueHub = useStore((s) => s.closeVenueHub);
  const setMatchTab = useStore((s) => s.setMatchTab);
  const setTournamentSubTab = useStore((s) => s.setTournamentSubTab);
  const setSelectedDateKey = useStore((s) => s.setSelectedDateKey);

  const restoredRef = useRef(false);
  const hashHydratedRef = useRef(false);

  const applyParsedHash = (parsed: ParsedAppHash, withReturnContext: boolean) => {
    if (parsed.matchId) {
      const ctx = withReturnContext ? (loadReturnContext() ?? undefined) : undefined;
      openMatchDetail(parsed.matchId, ctx);
      setMatchTab(parsed.matchTab);
      return;
    }
    if (parsed.venueSlug) {
      const ctx = withReturnContext ? (loadReturnContext() ?? undefined) : undefined;
      openVenueHub(parsed.venueSlug, ctx);
      return;
    }
    closeVenueHub();
    setActiveTab(parsed.tab);
    setSimulatorMode(parsed.simulatorMode);
    if (parsed.tab === "tournament") {
      setTournamentSubTab(parsed.tournamentSubTab);
      if (parsed.dateKey) setSelectedDateKey(parsed.dateKey);
    }
  };

  // Reconcile overlays / tournament sub-routes from hash before paint.
  useLayoutEffect(() => {
    const parsed = parseAppHash(window.location.hash);
    applyParsedHash(parsed, true);
    hashHydratedRef.current = true;
    if (!restoredRef.current) {
      restoredRef.current = true;
      logger.info("Route restored from URL hash", "HashSync", parsed);
    }
  }, [
    setActiveTab,
    setSimulatorMode,
    openMatchDetail,
    openVenueHub,
    closeVenueHub,
    setMatchTab,
    setTournamentSubTab,
    setSelectedDateKey,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppHash(window.location.hash);
      if (parsed.matchId) {
        const ctx = loadReturnContext() ?? undefined;
        openMatchDetail(parsed.matchId, ctx);
        setMatchTab(parsed.matchTab);
      } else if (parsed.venueSlug) {
        closeMatchDetail();
        const ctx = loadReturnContext() ?? undefined;
        openVenueHub(parsed.venueSlug, ctx);
      } else {
        closeMatchDetail();
        closeVenueHub();
        setActiveTab(parsed.tab);
        setSimulatorMode(parsed.simulatorMode);
        if (parsed.tab === "tournament") {
          setTournamentSubTab(parsed.tournamentSubTab);
          if (parsed.dateKey) setSelectedDateKey(parsed.dateKey);
        }
        clearReturnContext();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    closeMatchDetail,
    closeVenueHub,
    openMatchDetail,
    openVenueHub,
    setActiveTab,
    setMatchTab,
    setSimulatorMode,
    setTournamentSubTab,
    setSelectedDateKey,
  ]);

  useEffect(() => {
    if (!hashHydratedRef.current) return;

    let newHash: string;
    if (activeMatchId) {
      newHash = buildMatchHash(activeMatchId, activeMatchTab);
    } else if (activeVenueSlug) {
      newHash = buildVenueHash(activeVenueSlug);
    } else if (activeTab === "tournament") {
      newHash = buildTournamentHash(tournamentSubTab, selectedDateKey ?? undefined);
    } else {
      newHash = buildAppHash(activeTab, simulatorMode);
    }

    if (window.location.hash !== newHash) {
      if (activeMatchId || activeVenueSlug) {
        window.history.pushState(null, "", newHash);
      } else {
        window.history.replaceState(null, "", newHash);
      }
    }
  }, [
    activeTab,
    simulatorMode,
    activeMatchId,
    activeMatchTab,
    activeVenueSlug,
    tournamentSubTab,
    selectedDateKey,
  ]);
}

/** Navigation helper: open a match detail page with return context saved */
export function navigateToMatch(
  matchId: string,
  context: NavigationContext,
  openMatchDetail: (id: string, ctx?: NavigationContext) => void
): void {
  openMatchDetail(matchId, context);
}
