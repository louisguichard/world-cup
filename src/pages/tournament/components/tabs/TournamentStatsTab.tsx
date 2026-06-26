import { useEffect, useState } from "react";
import type { TournamentStatsBundle } from "../../../../services/matchDetail/fetchTournamentStats";
import { fetchTournamentStats } from "../../../../services/matchDetail/fetchTournamentStats";
import styles from "../../TournamentView.module.css";

export function TournamentStatsTab() {
  const [bundle, setBundle] = useState<TournamentStatsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTournamentStats().then((data) => {
      if (!cancelled) {
        setBundle(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ height: 48 }} />
          ))}
        </div>
      </div>
    );
  }

  const topScorers = bundle?.topScorers ?? [];
  const topAssists = bundle?.topAssists ?? [];
  const cleanSheets = bundle?.cleanSheets ?? [];

  const isEmpty = topScorers.length === 0 && topAssists.length === 0 && cleanSheets.length === 0;

  if (isEmpty) {
    return (
      <div className={styles.tabPanel}>
        <div className={styles.statsSection}>
          <div className={styles.statsPlaceholder}>
            <p>📊 Player statistics will be available once the tournament begins.</p>
            <p style={{ marginTop: 8, fontSize: 12 }}>
              Top scorers, assists, and clean sheets will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      {topScorers.length > 0 ? (
        <div className={styles.statsSection}>
          <h3 className={styles.statsSectionTitle}>⚽ Top Scorers</h3>
          {topScorers.slice(0, 10).map((stat, i) => (
            <div
              key={stat.player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--ss-border)"
              }}
            >
              <span style={{ width: 20, color: "var(--ss-muted)", fontSize: 12 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{stat.player.displayName}</div>
                <div style={{ fontSize: 11, color: "var(--ss-muted)" }}>{stat.teamId}</div>
              </div>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--ss-text)",
                  minWidth: 24,
                  textAlign: "right"
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {topAssists.length > 0 ? (
        <div className={styles.statsSection}>
          <h3 className={styles.statsSectionTitle}>🎯 Top Assists</h3>
          {topAssists.slice(0, 10).map((stat, i) => (
            <div
              key={stat.player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--ss-border)"
              }}
            >
              <span style={{ width: 20, color: "var(--ss-muted)", fontSize: 12 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{stat.player.displayName}</div>
                <div style={{ fontSize: 11, color: "var(--ss-muted)" }}>{stat.teamId}</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, minWidth: 24, textAlign: "right" }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {cleanSheets.length > 0 ? (
        <div className={styles.statsSection}>
          <h3 className={styles.statsSectionTitle}>🧤 Clean Sheets</h3>
          {cleanSheets.slice(0, 10).map((stat, i) => (
            <div
              key={stat.player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--ss-border)"
              }}
            >
              <span style={{ width: 20, color: "var(--ss-muted)", fontSize: 12 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{stat.player.displayName}</div>
                <div style={{ fontSize: 11, color: "var(--ss-muted)" }}>{stat.teamId}</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, minWidth: 24, textAlign: "right" }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
