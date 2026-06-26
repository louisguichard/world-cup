import { useEffect, useState } from "react";
import type { WcStanding } from "../../../../services/WorldCup2026LiveClient";
import { fetchStandings } from "../../../../services/WorldCup2026LiveClient";
import { useStore } from "../../../../store";
import styles from "../../TournamentView.module.css";

type StandingsRow = {
  position: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

function parseStandings(raw: WcStanding[]): WcStanding[] {
  return raw;
}

function GroupTable({ standing, openTeamSheet }: {
  standing: WcStanding;
  openTeamSheet: (id: string) => void;
}) {
  const rows: StandingsRow[] = standing.teams.map((t, i) => ({
    position: i + 1,
    name: t.name,
    played: t.played,
    won: t.won,
    drawn: t.drawn,
    lost: t.lost,
    gf: t.gf,
    ga: t.ga,
    gd: t.gd,
    points: t.points
  }));

  return (
    <div className={styles.standingsSection}>
      <div className={styles.standingsSectionTitle}>
        Group {standing.group}
      </div>
      <table className={styles.standingsTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              style={{ cursor: "pointer" }}
              onClick={() => {
                // Try to open team sheet by matching name to team id
                openTeamSheet(row.name);
              }}
            >
              <td style={{ color: "var(--ss-muted)" }}>{row.position}</td>
              <td style={{ fontWeight: 500, color: "var(--ss-text)" }}>{row.name}</td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.gf}</td>
              <td>{row.ga}</td>
              <td
                style={{
                  color: row.gd > 0 ? "var(--ss-success)" : row.gd < 0 ? "var(--ss-danger)" : "inherit"
                }}
              >
                {row.gd > 0 ? `+${row.gd}` : row.gd}
              </td>
              <td className={styles.standingsPts}>{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TournamentStandingsTab() {
  const [standings, setStandings] = useState<WcStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const groupStandings = useStore((s) => s.groupStandings);
  const openTeamSheet = useStore((s) => s.openTeamSheet);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchStandings().then((data) => {
      if (!cancelled) {
        setStandings(parseStandings(data));
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className={styles.skeleton} style={{ height: 24, marginBottom: 8 }} />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className={styles.skeleton} style={{ height: 36, marginBottom: 2 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (standings.length === 0) {
    // Fallback to local group standings
    if (groupStandings.length === 0) {
      return (
        <div className={styles.tabPanel}>
          <div className={styles.emptyState}>
            Standings not yet available. Check back once the group stage begins.
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabPanel}>
        <div style={{ padding: "8px 16px", fontSize: 11, color: "var(--ss-muted)" }}>
          Using projected standings — live data unavailable.
        </div>
        {/* Render from local Zustand groupStandings */}
        {groupStandings.map((gs) => (
          <div key={gs.group} className={styles.standingsSection}>
            <div className={styles.standingsSectionTitle}>Group {gs.group}</div>
            <table className={styles.standingsTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {gs.rows.map((row, i) => (
                  <tr
                    key={row.teamId}
                    style={{ cursor: "pointer" }}
                    onClick={() => openTeamSheet(row.teamId)}
                  >
                    <td style={{ color: "var(--ss-muted)" }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{row.teamId}</td>
                    <td>{row.played}</td>
                    <td>{row.wins}</td>
                    <td>{row.draws}</td>
                    <td>{row.losses}</td>
                    <td>{row.goalDifference}</td>
                    <td className={styles.standingsPts}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      {standings.map((standing) => (
        <GroupTable key={standing.group} standing={standing} openTeamSheet={openTeamSheet} />
      ))}
    </div>
  );
}
