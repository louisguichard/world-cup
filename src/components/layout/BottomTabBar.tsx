import type { TabId } from "../../types";
import { useStore } from "../../store";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "schedule", label: "Schedule" },
  { id: "results", label: "Results" },
  { id: "groups", label: "Groups" },
  { id: "bracket", label: "Bracket" },
  { id: "teams", label: "Teams" },
  { id: "simulator", label: "Simulator" }
];

export function BottomTabBar() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const liveCount = useStore((s) => {
    let count = 0;
    for (const match of Object.values(s.liveMatches)) {
      if (match.status === "live") count += 1;
    }
    return count;
  });

  return (
    <nav className="bottom-tab-bar" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-tab ${activeTab === tab.id ? "bottom-tab--active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
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
