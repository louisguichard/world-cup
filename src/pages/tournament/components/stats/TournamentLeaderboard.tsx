import type { Team, TournamentPlayerStat } from "../../../../types";
import { teamLabel } from "../../../../lib/aggregateTournamentStats";
import { TeamFlag } from "../../../../components/team/TeamFlag";
import styles from "../../TournamentView.module.css";

type Props = {
  title: string;
  stats: TournamentPlayerStat[];
  teams: Record<string, Team>;
  unit?: string;
};

export function TournamentLeaderboard({ title, stats, teams, unit = "G" }: Props) {
  if (stats.length === 0) {
    return (
      <section className={styles.statsSection}>
        <h3 className={styles.statsSectionTitle}>{title}</h3>
        <p className={styles.statsEmptyNote}>No data yet — updates as goals are recorded in live feeds.</p>
      </section>
    );
  }

  return (
    <section className={styles.statsSection}>
      <h3 className={styles.statsSectionTitle}>{title}</h3>
      <ol className={styles.leaderboardList}>
        {stats.slice(0, 15).map((stat, i) => {
          const team = teams[stat.teamId];
          return (
            <li key={`${stat.player.id}-${stat.teamId}`} className={styles.leaderboardRow}>
              <span className={styles.leaderboardRank}>{i + 1}</span>
              <TeamFlag team={team} teamId={stat.teamId} size="sm" />
              <div className={styles.leaderboardMeta}>
                <span className={styles.leaderboardName}>{stat.player.displayName}</span>
                <span className={styles.leaderboardTeam}>{teamLabel(stat.teamId, teams)}</span>
              </div>
              <span className={styles.leaderboardValue}>
                {stat.value}
                <span className={styles.leaderboardUnit}>{unit}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
