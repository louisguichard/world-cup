import { Suspense, lazy, useEffect, useRef, useState, useCallback } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { SplashScreen } from "./SplashScreen";
import { InstallAppBanner } from "./InstallAppBanner";
import { DebugPanel } from "../shared/DebugPanel";
import { UiDebugHost } from "../debug/UiDebugHost";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { ApiSetupBanner } from "../shared/ApiSetupBanner";
import { DataFreshnessBanner } from "../shared/DataFreshnessBanner";
import { useColorScheme } from "../../hooks/useColorScheme";
import { useHashSync } from "../../hooks/useHashSync";
import { useQualificationChangeLogger } from "../../hooks/useQualificationChangeLogger";
import { usePlatform } from "../../hooks/usePlatform";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { DataOrchestrator } from "../../services/orchestrator/DataOrchestrator";
import { useStore } from "../../store";
import { ViewLoadingFallback } from "../shared/LoadingState";

const LiveView = lazy(() =>
  import("../views/LiveView").then((m) => ({ default: m.LiveView }))
);
const ResultsView = lazy(() =>
  import("../views/ResultsView").then((m) => ({ default: m.ResultsView }))
);
const BracketView = lazy(() =>
  import("../views/BracketView").then((m) => ({ default: m.BracketView }))
);
const GroupsView = lazy(() =>
  import("../views/GroupsView").then((m) => ({ default: m.GroupsView }))
);
const TeamsView = lazy(() =>
  import("../views/TeamsView").then((m) => ({ default: m.TeamsView }))
);
const SimulatorView = lazy(() =>
  import("../simulator/SimulatorView").then((m) => ({ default: m.SimulatorView }))
);
const ScheduleView = lazy(() =>
  import("../views/ScheduleView").then((m) => ({ default: m.ScheduleView }))
);
const TournamentView = lazy(() =>
  import("../../pages/tournament/TournamentView").then((m) => ({ default: m.TournamentView }))
);
const VenueHubView = lazy(() =>
  import("../../pages/venue/VenueHubView").then((m) => ({ default: m.VenueHubView }))
);
const MatchDetailView = lazy(() =>
  import("../../pages/match/MatchDetailView").then((m) => ({ default: m.MatchDetailView }))
);
const TeamDetailSheet = lazy(() =>
  import("../team-detail/TeamDetailSheet").then((m) => ({ default: m.TeamDetailSheet }))
);

export function AppShell() {
  const activeTab = useStore((s) => s.activeTab);
  const splashPhase = useStore((s) => s.splashPhase);
  const lastGoalAnnouncement = useStore((s) => s.lastGoalAnnouncement);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const activeVenueSlug = useStore((s) => s.activeVenueSlug);
  const teamSheetOpen = useStore((s) => s.teamSheetOpen);
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
    <UiDebugHost
      scanKey={`${activeTab}:${activeMatchId ?? ""}:${activeVenueSlug ?? ""}:${teamSheetOpen}`}
    >
      <div className="wc-chrome">
      <ApiSetupBanner />
      <DataFreshnessBanner />
      <TopNavBar compact={activeTab === "simulator"} />
      <main
        ref={mainRef}
        className={`wc-main${refreshing ? " is-refreshing" : ""}`}
      >
        {splashPhase === "done" && !activeMatchId && !activeVenueSlug ? <InstallAppBanner /> : null}
        {activeTab === "live" ? (
          <BentoErrorBoundary bento="LiveView">
            <Suspense fallback={<ViewLoadingFallback />}>
              <LiveView />
            </Suspense>
          </BentoErrorBoundary>
        ) : null}
        <Suspense fallback={<ViewLoadingFallback />}>
          {activeTab === "results" ? (
            <BentoErrorBoundary bento="ResultsView"><ResultsView /></BentoErrorBoundary>
          ) : null}
          {activeTab === "bracket" ? (
            <BentoErrorBoundary bento="BracketView"><BracketView /></BentoErrorBoundary>
          ) : null}
          {activeTab === "groups" ? (
            <BentoErrorBoundary bento="GroupsView"><GroupsView /></BentoErrorBoundary>
          ) : null}
          {activeTab === "simulator" ? (
            <BentoErrorBoundary bento="SimulatorView">
              <div className="wc-main-simulator">
                <SimulatorView />
              </div>
            </BentoErrorBoundary>
          ) : null}
          {activeTab === "teams" ? (
            <BentoErrorBoundary bento="TeamsView"><TeamsView /></BentoErrorBoundary>
          ) : null}
          {activeTab === "schedule" ? (
            <BentoErrorBoundary bento="ScheduleView"><ScheduleView /></BentoErrorBoundary>
          ) : null}
          {activeTab === "tournament" ? (
            <BentoErrorBoundary bento="TournamentView"><TournamentView /></BentoErrorBoundary>
          ) : null}
        </Suspense>
      </main>
      <BottomTabBar />
      <SplashScreen />
      {teamSheetOpen ? (
        <Suspense fallback={<ViewLoadingFallback />}>
          <TeamDetailSheet />
        </Suspense>
      ) : null}
      <DebugPanel />
      <div id="sr-live" className="sr-only" aria-live="polite" />
      <Suspense fallback={<ViewLoadingFallback />}>
        {activeVenueSlug && !activeMatchId ? <VenueHubView /> : null}
        {activeMatchId ? <MatchDetailView /> : null}
      </Suspense>
    </div>
    </UiDebugHost>
  );
}
