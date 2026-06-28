import { useMemo } from "react";
import {
  groupLetters,
  type GroupStanding,
  type Team,
  type TeamRecord,
} from "../../../../types";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../../../lib/matchTeamDisplay";
import { useStore } from "../../../../store";
import styles from "../../TournamentView.module.css";

function GroupTable({
  standing,
  teams,
  openTeamSheet,
}: {
  standing: GroupStanding;
  teams: Record<string, Team>;
  openTeamSheet: (id: string) => void;
}) {
  const rows: TeamRecord[] = standing.rows;

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
          {rows.map((row, index) => (
            <tr
              key={row.teamId}
              style={{ cursor: "pointer" }}
              onClick={() => openTeamSheet(row.teamId)}
            >
              <td style={{ color: "var(--ss-muted)" }}>{index + 1}</td>
              <td style={{ fontWeight: 500, color: "var(--ss-text)" }}>
                {teamDisplayNameFromId(row.teamId, teams)}
              </td>
              <td>{row.played}</td>
              <td>{row.wins}</td>
              <td>{row.draws}</td>
              <td>{row.losses}</td>
              <td>{row.goalsFor}</td>
              <td>{row.goalsAgainst}</td>
              <td
                style={{
                  color:
                    row.goalDifference > 0
                      ? "var(--ss-success)"
                      : row.goalDifference < 0
                        ? "var(--ss-danger)"
                        : "inherit",
                }}
              >
                {row.goalDifference > 0
                  ? `+${row.goalDifference}`
                  : row.goalDifference}
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
  const groupStandings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const standings = useMemo(
    () =>
      groupLetters
        .map((group) => groupStandings.find((standing) => standing.group === group))
        .filter((standing): standing is GroupStanding => Boolean(standing)),
    [groupStandings]
  );

  if (standings.length === 0) {
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
        Unified standings feed: all tabs and simulations use the same live dataset.
      </div>
      {standings.map((standing) => (
        <GroupTable
          key={standing.group}
          standing={standing}
          teams={teams}
          openTeamSheet={openTeamSheet}
        />
      ))}
    </div>
  );
}
