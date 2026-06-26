import { useStore } from "../../store";
import { TournamentMatchesTab } from "./components/tabs/TournamentMatchesTab";
import { TournamentStandingsTab } from "./components/tabs/TournamentStandingsTab";
import { TournamentBracketTab } from "./components/tabs/TournamentBracketTab";
import { TournamentStatsTab } from "./components/tabs/TournamentStatsTab";
import type { TournamentSubTab } from "../../types";
import { APP_BRAND } from "../../config/appMeta";
import styles from "./TournamentView.module.css";

const SUB_TABS: { id: TournamentSubTab; label: string }[] = [
  { id: "matches", label: "Matches" },
  { id: "standings", label: "Standings" },
  { id: "bracket", label: "Bracket" },
  { id: "stats", label: "Stats" }
];

export function TournamentView() {
  const tournamentSubTab = useStore((s) => s.tournamentSubTab);
  const setTournamentSubTab = useStore((s) => s.setTournamentSubTab);

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{APP_BRAND.tournament}</h1>
        <p className={styles.headerSubtitle}>USA · Canada · Mexico</p>
      </header>

      {/* Sub-tab navigation */}
      <nav className={styles.tabNav} aria-label="Tournament sections">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabBtn} ${tournamentSubTab === tab.id ? styles["tabBtn--active"] : ""}`}
            onClick={() => setTournamentSubTab(tab.id)}
            aria-current={tournamentSubTab === tab.id ? "page" : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className={styles.content}>
        {tournamentSubTab === "matches" ? <TournamentMatchesTab /> : null}
        {tournamentSubTab === "standings" ? <TournamentStandingsTab /> : null}
        {tournamentSubTab === "bracket" ? <TournamentBracketTab /> : null}
        {tournamentSubTab === "stats" ? <TournamentStatsTab /> : null}
      </div>
    </div>
  );
}
