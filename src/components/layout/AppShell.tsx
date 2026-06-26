import { useEffect, useRef } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { SplashScreen } from "./SplashScreen";
import { DebugPanel } from "../shared/DebugPanel";
import { useHashSync } from "../../hooks/useHashSync";
import { useQualificationChangeLogger } from "../../hooks/useQualificationChangeLogger";
import { useStore } from "../../store";
import { LiveView } from "../views/LiveView";
import { ResultsView } from "../views/ResultsView";
import { BracketView } from "../views/BracketView";
import { GroupsView } from "../views/GroupsView";
import { TeamsView } from "../views/TeamsView";
import { SimulatorView } from "../simulator/SimulatorView";
import { ScheduleView } from "../views/ScheduleView";
import { TournamentView } from "../../pages/tournament/TournamentView";
import { MatchDetailView } from "../../pages/match/MatchDetailView";
import { TeamDetailSheet } from "../team-detail/TeamDetailSheet";

export function AppShell() {
  const activeTab = useStore((s) => s.activeTab);
  const splashPhase = useStore((s) => s.splashPhase);
  const lastGoalAnnouncement = useStore((s) => s.lastGoalAnnouncement);
  const activeMatchId = useStore((s) => s.activeMatchId);
  const mainRef = useRef<HTMLElement>(null);

  useHashSync();
  useQualificationChangeLogger();

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
      <TopNavBar hidden={activeTab === "simulator" || !!activeMatchId} />
      <main ref={mainRef} className="wc-main">
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
      {activeMatchId ? <MatchDetailView /> : null}
    </div>
  );
}
