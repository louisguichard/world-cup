import { useEffect, useRef, useState, useCallback } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { SplashScreen } from "./SplashScreen";
import { InstallAppBanner } from "./InstallAppBanner";
import { DebugPanel } from "../shared/DebugPanel";
import { ApiSetupBanner } from "../shared/ApiSetupBanner";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useHashSync } from "../../hooks/useHashSync";
import { useQualificationChangeLogger } from "../../hooks/useQualificationChangeLogger";
import { usePlatform } from "../../hooks/usePlatform";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { APP_COPY } from "../../lib/appCopy";
import { DataOrchestrator } from "../../services/orchestrator/DataOrchestrator";
import { useStore } from "../../store";
import { LiveView } from "../views/LiveView";
import { ResultsView } from "../views/ResultsView";
import { BracketView } from "../views/BracketView";
import { GroupsView } from "../views/GroupsView";
import { TeamsView } from "../views/TeamsView";
import { SimulatorView } from "../simulator/SimulatorView";
import { ScheduleView } from "../views/ScheduleView";
import { TournamentView } from "../../pages/tournament/TournamentView";
import { VenueHubView } from "../../pages/venue/VenueHubView";
import { MatchDetailView } from "../../pages/match/MatchDetailView";
import { TeamDetailSheet } from "../team-detail/TeamDetailSheet";

export function AppShell() {
  const activeTab = useStore((s) => s.activeTab);
  const splashPhase = useStore((s) => s.splashPhase);
  const lastGoalAnnouncement = useStore((s) => s.lastGoalAnnouncement);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const activeVenueSlug = useStore((s) => s.activeVenueSlug);
  const mainRef = useRef<HTMLElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isTouch } = usePlatform();

  useHashSync();
  useColorScheme();
  useQualificationChangeLogger();

  const refreshLiveData = useCallback(async () => {
    setRefreshing(true);
    try {
      const orchestrator = DataOrchestrator.getInstance();
      await Promise.all([orchestrator.tickLive(), orchestrator.refreshStandings()]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  usePullToRefresh(
    mainRef,
    () => {
      void refreshLiveData();
    },
    isTouch && splashPhase === "done" && !activeMatchId && !activeVenueSlug
  );

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (splashPhase !== "done") {
      main.setAttribute("inert", "");
    } else {
      main.removeAttribute("inert");
    }
  }, [splashPhase]);

  useEffect(() => {
    const sr = document.getElementById("sr-live");
    if (sr && lastGoalAnnouncement) sr.textContent = lastGoalAnnouncement;
  }, [lastGoalAnnouncement]);

  return (
    <div className="wc-chrome">
      <ApiSetupBanner />
      <TopNavBar hidden={activeTab === "simulator" || !!activeMatchId || !!activeVenueSlug} />
      <main
        ref={mainRef}
        className={`wc-main${refreshing ? " is-refreshing" : ""}`}
      >
        {splashPhase === "done" && !activeMatchId && !activeVenueSlug ? <InstallAppBanner /> : null}
        {activeTab === "live" ? <LiveView /> : null}
        {activeTab === "results" ? <ResultsView /> : null}
        {activeTab === "bracket" ? <BracketView /> : null}
        {activeTab === "groups" ? <GroupsView /> : null}
        {activeTab === "simulator" ? (
          <div className="wc-main-simulator">
            <SimulatorView />
          </div>
        ) : null}
        {activeTab === "teams" ? <TeamsView /> : null}
        {activeTab === "schedule" ? <ScheduleView /> : null}
        {activeTab === "tournament" ? <TournamentView /> : null}
      </main>
      <BottomTabBar />
      <SplashScreen />
      <TeamDetailSheet />
      <DebugPanel />
      <div id="sr-live" className="sr-only" aria-live="polite" />
      {/* Full-page match detail overlays everything when active */}
      {activeVenueSlug && !activeMatchId ? <VenueHubView /> : null}
      {activeMatchId ? <MatchDetailView /> : null}
    </div>
  );
}
