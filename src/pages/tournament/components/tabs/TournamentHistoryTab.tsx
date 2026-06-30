import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../../../store";
import { buildWorldCupHistoryStats, getTournamentByYear } from "../../../../lib/worldCupHistoryStats";
import type { WorldCupAwardEntry } from "../../../../types/worldCupHistory";
import { AllTimeLeadersSection } from "../stats/AllTimeLeadersSection";
import { LoadingState } from "../../../../components/shared/LoadingState";
import styles from "../../TournamentView.module.css";

function AwardTable({ title, rows }: { title: string; rows: WorldCupAwardEntry[] }) {
  if (rows.length === 0) return null;
  return (
    <section className={styles.statsSection}>
      <h3 className={styles.statsSectionTitle}>{title}</h3>
      <ol className={styles.leaderboardList}>
        {rows.map((row) => (
          <li key={`${row.year}-${row.player}`} className={styles.leaderboardRow}>
            <span className={styles.leaderboardRank}>{row.year}</span>
            <div className={styles.leaderboardMeta}>
              <span className={styles.leaderboardName}>{row.player}</span>
              <span className={styles.leaderboardTeam}>
                {row.country}
                {row.goals != null ? ` · ${row.goals} goals` : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TournamentHistoryTab() {
  const bundle = useStore((s) => s.worldCupHistoryBundle);
  const syncRunning = useStore((s) => s.worldCupHistorySyncRunning);
  const loadWorldCupYearDetail = useStore((s) => s.loadWorldCupYearDetail);

  const stats = useMemo(() => buildWorldCupHistoryStats(bundle), [bundle]);
  const editions = bundle?.worldCups ?? [];
  const [selectedYear, setSelectedYear] = useState<number | null>(editions[0]?.year ?? null);

  useEffect(() => {
    if (editions.length > 0 && (selectedYear == null || !editions.some((e) => e.year === selectedYear))) {
      setSelectedYear(editions[0]?.year ?? null);
    }
  }, [editions, selectedYear]);

  useEffect(() => {
    if (selectedYear != null) loadWorldCupYearDetail(selectedYear);
  }, [selectedYear, loadWorldCupYearDetail]);

  const selected = selectedYear != null ? getTournamentByYear(bundle, selectedYear) : undefined;

  if (!bundle && syncRunning) {
    return (
      <div className={styles.tabPanel}>
        <LoadingState label="Loading World Cup history…" />
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      <div className={styles.statsIntro}>
        <h2 className={styles.statsIntroTitle}>World Cup history</h2>
        <p className={styles.statsIntroText}>
          Historic winners and FIFA awards from 1930–2018, synced once per day from the World Cup1 API.
          {bundle?.partial ? " Some endpoints were unavailable on the last sync — showing cached data." : null}
        </p>
        {bundle?.fetchedAt ? (
          <p className={styles.statsSectionNote}>Last updated {new Date(bundle.fetchedAt).toLocaleString()}</p>
        ) : null}
      </div>

      {stats.titleLeaders.length > 0 ? (
        <AllTimeLeadersSection
          title="Most World Cup titles"
          leaders={stats.titleLeaders}
          valueSuffix="★"
          note="Derived from World Cup1 winners database"
        />
      ) : null}

      {stats.topScorersFromBoot.length > 0 ? (
        <AllTimeLeadersSection
          title="Golden Boot highs"
          leaders={stats.topScorersFromBoot}
          valueSuffix="G"
          note="Single-tournament top scorers from API"
        />
      ) : null}

      <AwardTable title="Golden Ball" rows={bundle?.goldenBall ?? []} />
      <AwardTable title="Golden Boot" rows={bundle?.goldenBoot ?? []} />
      <AwardTable title="Golden Glove" rows={bundle?.goldenGlove ?? []} />
      <AwardTable title="Best Young Player" rows={bundle?.bestYoungPlayer ?? []} />

      {editions.length > 0 ? (
        <section className={styles.statsSection}>
          <h3 className={styles.statsSectionTitle}>Editions timeline</h3>
          <div className={styles.historyYearPicker}>
            {editions.map((edition) => (
              <button
                key={edition.year}
                type="button"
                className={`${styles.historyYearBtn} ${selectedYear === edition.year ? styles["historyYearBtn--active"] : ""}`}
                onClick={() => setSelectedYear(edition.year)}
              >
                {edition.year}
              </button>
            ))}
          </div>

          {selected ? (
            <div className={styles.historyDetailCard}>
              <h4 className={styles.historyDetailTitle}>{selected.year} World Cup</h4>
              {selected.host ? <p className={styles.historyDetailLine}>Host · {selected.host}</p> : null}
              <p className={styles.historyDetailLine}>Champion · {selected.winner}</p>
              {selected.runnerUp ? <p className={styles.historyDetailLine}>Runner-up · {selected.runnerUp}</p> : null}
              {selected.thirdPlace ? <p className={styles.historyDetailLine}>Third · {selected.thirdPlace}</p> : null}
              {selected.goldenBall ? (
                <p className={styles.historyDetailLine}>
                  Golden Ball · {selected.goldenBall.player} ({selected.goldenBall.country})
                </p>
              ) : null}
              {selected.goldenBoot ? (
                <p className={styles.historyDetailLine}>
                  Golden Boot · {selected.goldenBoot.player}
                  {selected.goldenBoot.goals != null ? ` · ${selected.goldenBoot.goals} goals` : ""}
                </p>
              ) : null}
              {selected.goldenGlove ? (
                <p className={styles.historyDetailLine}>
                  Golden Glove · {selected.goldenGlove.player} ({selected.goldenGlove.country})
                </p>
              ) : null}
              {selected.bestYoungPlayer ? (
                <p className={styles.historyDetailLine}>
                  Best Young Player · {selected.bestYoungPlayer.player} ({selected.bestYoungPlayer.country})
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className={styles.statsSectionNote}>
          No historic data cached yet. The daily sync runs on app load when the API quota is available.
        </p>
      )}
    </div>
  );
}
