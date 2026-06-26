import { useEffect, useRef } from "react";
import { logger } from "../services/Logger";
import { clearReturnContext, loadReturnContext } from "../store/slices/navigationSlice";
import { useStore } from "../store";
import type { MatchDetailTab, NavigationContext, SimulatorMode, TabId, TournamentSubTab } from "../types";

const VALID_TABS: TabId[] = [
  "live",
  "results",
  "bracket",
  "groups",
  "simulator",
  "teams",
  "schedule",
  "tournament"
];
const VALID_SIMULATOR_MODES: SimulatorMode[] = ["tournament", "probabilities", "methodology"];
const VALID_MATCH_TABS: MatchDetailTab[] = ["summary", "statistics", "lineups", "commentary", "h2h"];
const VALID_TOURNAMENT_SUB_TABS: TournamentSubTab[] = ["matches", "standings", "bracket", "stats"];

export type ParsedAppHash = {
  tab: TabId;
  simulatorMode: SimulatorMode;
  matchId: string | null;
  matchTab: MatchDetailTab;
  tournamentSubTab: TournamentSubTab;
  dateKey: string | null;
};

export function parseAppHash(hash: string): ParsedAppHash {
  const stripped = hash.replace(/^#/, "");
  // Separate query string from hash path
  const [pathPart, queryPart] = stripped.split("?");
  const parts = pathPart.split("/");
  const [primary, secondary, tertiary] = parts;

  const dateKey = queryPart
    ? (new URLSearchParams(queryPart).get("date") ?? null)
    : null;

  // Match detail route: #match/{matchId} or #match/{matchId}/{tab}
  if (primary === "match" && secondary) {
    const matchTab = VALID_MATCH_TABS.includes(tertiary as MatchDetailTab)
      ? (tertiary as MatchDetailTab)
      : "summary";
    return {
      tab: "live",
      simulatorMode: "tournament",
      matchId: secondary,
      matchTab,
      tournamentSubTab: "matches",
      dateKey: null
    };
  }

  // Tournament route: #tournament or #tournament/{subTab}
  if (primary === "tournament") {
    const subTab = VALID_TOURNAMENT_SUB_TABS.includes(secondary as TournamentSubTab)
      ? (secondary as TournamentSubTab)
      : "matches";
    return {
      tab: "tournament",
      simulatorMode: "tournament",
      matchId: null,
      matchTab: "summary",
      tournamentSubTab: subTab,
      // date query param only applies to the Matches sub-tab
      dateKey: subTab === "matches" ? dateKey : null
    };
  }

  // Standard tab route
  const tab = VALID_TABS.includes(primary as TabId) ? (primary as TabId) : "live";
  const simulatorMode =
    tab === "simulator" && VALID_SIMULATOR_MODES.includes(secondary as SimulatorMode)
      ? (secondary as SimulatorMode)
      : "tournament";

  return {
    tab,
    simulatorMode,
    matchId: null,
    matchTab: "summary",
    tournamentSubTab: "matches",
    dateKey: null
  };
}

export function buildAppHash(tab: TabId, simulatorMode: SimulatorMode): string {
  if (tab === "simulator" && simulatorMode !== "tournament") {
    return `#simulator/${simulatorMode}`;
  }
  if (tab === "simulator") {
    return "#simulator";
  }
  return `#${tab}`;
}

export function buildMatchHash(matchId: string, tab?: MatchDetailTab): string {
  if (tab && tab !== "summary") {
    return `#match/${matchId}/${tab}`;
  }
  return `#match/${matchId}`;
}

export function buildTournamentHash(subTab?: TournamentSubTab, dateKey?: string): string {
  const base = subTab && subTab !== "matches" ? `#tournament/${subTab}` : "#tournament";
  if (dateKey && (!subTab || subTab === "matches")) {
    return `${base}?date=${dateKey}`;
  }
  return base;
}

export function useHashSync(): void {
  const activeTab = useStore((s) => s.activeTab);
  const simulatorMode = useStore((s) => s.simulatorMode);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const activeMatchTab = useStore((s) => s.activeMatchTab);
  const tournamentSubTab = useStore((s) => s.tournamentSubTab);
  const selectedDateKey = useStore((s) => s.selectedDateKey);

  const setActiveTab = useStore((s) => s.setActiveTab);
  const setSimulatorMode = useStore((s) => s.setSimulatorMode);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const closeMatchDetail = useStore((s) => s.closeMatchDetail);
  const setMatchTab = useStore((s) => s.setMatchTab);
  const setTournamentSubTab = useStore((s) => s.setTournamentSubTab);
  const setSelectedDateKey = useStore((s) => s.setSelectedDateKey);

  const restoredRef = useRef(false);

  // Restore state from initial hash on mount
  useEffect(() => {
    const parsed = parseAppHash(window.location.hash);
    if (parsed.matchId) {
      const ctx = loadReturnContext() ?? undefined;
      openMatchDetail(parsed.matchId, ctx);
      setMatchTab(parsed.matchTab);
    } else {
      setActiveTab(parsed.tab);
      setSimulatorMode(parsed.simulatorMode);
      if (parsed.tab === "tournament") {
        setTournamentSubTab(parsed.tournamentSubTab);
        if (parsed.dateKey) setSelectedDateKey(parsed.dateKey);
      }
    }

    if (!restoredRef.current) {
      restoredRef.current = true;
      logger.info("Route restored from URL hash", "HashSync", parsed);
    }
  }, [setActiveTab, setSimulatorMode, openMatchDetail, setMatchTab, setTournamentSubTab, setSelectedDateKey]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseAppHash(window.location.hash);
      if (parsed.matchId) {
        const ctx = loadReturnContext() ?? undefined;
        openMatchDetail(parsed.matchId, ctx);
        setMatchTab(parsed.matchTab);
      } else {
        closeMatchDetail();
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
  }, [closeMatchDetail, openMatchDetail, setActiveTab, setMatchTab, setSimulatorMode, setTournamentSubTab, setSelectedDateKey]);

  // Sync store state → URL hash
  useEffect(() => {
    let newHash: string;
    if (activeMatchId) {
      newHash = buildMatchHash(activeMatchId, activeMatchTab);
    } else if (activeTab === "tournament") {
      newHash = buildTournamentHash(tournamentSubTab, selectedDateKey ?? undefined);
    } else {
      newHash = buildAppHash(activeTab, simulatorMode);
    }

    if (window.location.hash !== newHash) {
      // Use pushState when entering match detail so Back button works;
      // replaceState for all other tab/sub-tab switches.
      if (activeMatchId) {
        window.history.pushState(null, "", newHash);
      } else {
        window.history.replaceState(null, "", newHash);
      }
    }
  }, [activeTab, simulatorMode, activeMatchId, activeMatchTab, tournamentSubTab, selectedDateKey]);
}

/** Navigation helper: open a match detail page with return context saved */
export function navigateToMatch(
  matchId: string,
  context: NavigationContext,
  openMatchDetail: (id: string, ctx?: NavigationContext) => void
): void {
  openMatchDetail(matchId, context);
}
