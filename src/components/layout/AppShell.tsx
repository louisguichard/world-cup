import { useEffect } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { SplashScreen } from "./SplashScreen";
import { DebugPanel } from "../shared/DebugPanel";
import { useHashSync } from "../../hooks/useHashSync";
import { useQualificationChangeLogger } from "../../hooks/useQualificationChangeLogger";
import { useStore } from "../../store";
import { LiveView } from "../views/LiveView";
import { BracketView } from "../views/BracketView";
import { GroupsView } from "../views/GroupsView";
import { TeamsView } from "../views/TeamsView";
import { SimulatorView } from "../simulator/SimulatorView";
import { TeamDetailSheet } from "../team-detail/TeamDetailSheet";

export function AppShell() {
  const activeTab = useStore((s) => s.activeTab);
  const splashPhase = useStore((s) => s.splashPhase);
  const lastGoalAnnouncement = useStore((s) => s.lastGoalAnnouncement);

  useHashSync();
  useQualificationChangeLogger();

  useEffect(() => {
    const sr = document.getElementById("sr-live");
    if (sr && lastGoalAnnouncement) sr.textContent = lastGoalAnnouncement;
  }, [lastGoalAnnouncement]);

  return (
    <div className="wc-chrome">
      <TopNavBar />
      <main className="wc-main" aria-hidden={splashPhase !== "done"}>
        {activeTab === "live" ? <LiveView /> : null}
        {activeTab === "bracket" ? <BracketView /> : null}
        {activeTab === "groups" ? <GroupsView /> : null}
        {activeTab === "simulator" ? <SimulatorView /> : null}
        {activeTab === "teams" ? <TeamsView /> : null}
      </main>
      <BottomTabBar />
      <SplashScreen />
      <TeamDetailSheet />
      <DebugPanel />
      <div id="sr-live" className="sr-only" aria-live="polite" />
    </div>
  );
}
