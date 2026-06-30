import type { HighlightlyHighlight, HighlightlyMatch, HighlightlyTeamSeasonStats } from "../../types/sportHighlights";
import { LoadingState } from "../shared/LoadingState";
import styles from "./TeamHighlightlyPanel.module.css";

type Props = {
  teamName: string;
  highlights: HighlightlyHighlight[];
  lastFive: HighlightlyMatch[];
  seasonStats: HighlightlyTeamSeasonStats[];
  loading: boolean;
};

function parseScore(score?: string | null): string {
  return score?.trim() || "—";
}

export function TeamHighlightlyPanel({
  teamName,
  highlights,
  lastFive,
  seasonStats,
  loading,
}: Props) {
  if (loading && highlights.length === 0 && lastFive.length === 0) {
    return <LoadingState label="Loading Highlightly data…" className="team-sheet-empty" />;
  }

  const wcStats = seasonStats.find((s) => s.leagueName?.toLowerCase().includes("world cup"));

  return (
    <div className={styles.wrap}>
      {wcStats?.total?.games ? (
        <section className={styles.block}>
          <h3 className={styles.heading}>Tournament record</h3>
          <dl className={styles.statsGrid}>
            <div>
              <dt>Played</dt>
              <dd>{wcStats.total.games.played ?? 0}</dd>
            </div>
            <div>
              <dt>Wins</dt>
              <dd>{wcStats.total.games.wins ?? 0}</dd>
            </div>
            <div>
              <dt>Draws</dt>
              <dd>{wcStats.total.games.draws ?? 0}</dd>
            </div>
            <div>
              <dt>Losses</dt>
              <dd>{wcStats.total.games.loses ?? 0}</dd>
            </div>
            <div>
              <dt>Goals</dt>
              <dd>
                {wcStats.total.goals?.scored ?? 0}–{wcStats.total.goals?.received ?? 0}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {lastFive.length > 0 ? (
        <section className={styles.block}>
          <h3 className={styles.heading}>Last five games</h3>
          <ul className={styles.formList}>
            {lastFive.map((m) => (
              <li key={m.id} className={styles.formRow}>
                <span className={styles.formDate}>{m.date.slice(0, 10)}</span>
                <span className={styles.formMatch}>
                  {m.homeTeam.name} vs {m.awayTeam.name}
                </span>
                <span className={styles.formScore}>{parseScore(m.state?.score?.current)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className={styles.block}>
          <h3 className={styles.heading}>Highlights</h3>
          <ul className={styles.hlList}>
            {highlights.slice(0, 8).map((h) => (
              <li key={h.id} className={styles.hlRow}>
                <div>
                  <strong>{h.title ?? "Highlight"}</strong>
                  {h.description ? <p className={styles.hlDesc}>{h.description}</p> : null}
                </div>
                {h.url ? (
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className={styles.hlLink}>
                    Watch
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : !loading ? (
        <p className="team-sheet-empty">No Highlightly clips for {teamName} yet.</p>
      ) : null}
    </div>
  );
}
