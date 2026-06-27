import type { TabId } from "../../types";
import { useStore } from "../../store";
import { ThemeToggle } from "../shared/ThemeToggle";
import { APP_COPY } from "../../lib/appCopy";
import { navigateToTab } from "../../lib/navigateToTab";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: APP_COPY.tabs.live },
  { id: "tournament", label: APP_COPY.tabs.tournament },
  { id: "schedule", label: APP_COPY.tabs.schedule },
  { id: "results", label: APP_COPY.tabs.results },
  { id: "groups", label: APP_COPY.tabs.groups },
  { id: "bracket", label: APP_COPY.tabs.bracket },
  { id: "teams", label: APP_COPY.tabs.teams },
  { id: "simulator", label: APP_COPY.tabs.simulator }
];

export function BottomTabBar() {
  const activeTab = useStore((s) => s.activeTab);
  const liveCount = useStore((s) => {
    let count = 0;
    for (const match of Object.values(s.liveMatches)) {
      if (match.status === "live") count += 1;
    }
    return count;
  });

  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      <div className="bottom-tab-theme" aria-label="Theme">
        <ThemeToggle compact />
      </div>
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-tab ${activeTab === tab.id ? "bottom-tab--active" : ""}`}
          onClick={() => navigateToTab(tab.id)}
          aria-current={activeTab === tab.id ? "page" : undefined}
        >
          {tab.label}
          {tab.id === "live" && liveCount > 0 ? (
            <span className="bottom-tab-badge" aria-label={`${liveCount} live matches`}>
              {liveCount}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
