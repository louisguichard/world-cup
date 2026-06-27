import type { AllTimeLeader } from "../../../../data/worldCupAllTimeLeaders";
import styles from "../../TournamentView.module.css";

type Props = {
  title: string;
  leaders: AllTimeLeader[];
  valueSuffix?: string;
  note?: string;
};

export function AllTimeLeadersSection({ title, leaders, valueSuffix = "", note }: Props) {
  return (
    <section className={styles.statsSection}>
      <h3 className={styles.statsSectionTitle}>{title}</h3>
      <p className={styles.statsSectionNote}>{note ?? "All-time FIFA World Cup records through 2022."}</p>
      <ol className={styles.leaderboardList}>
        {leaders.map((leader) => (
          <li key={`${leader.rank}-${leader.player}`} className={styles.leaderboardRow}>
            <span className={styles.leaderboardRank}>{leader.rank}</span>
            <div className={styles.leaderboardMeta}>
              <span className={styles.leaderboardName}>{leader.player}</span>
              <span className={styles.leaderboardTeam}>
                {leader.country}
                {leader.note ? ` · ${leader.note}` : ""}
              </span>
            </div>
            <span className={styles.leaderboardValue}>
              {leader.value}
              {valueSuffix ? <span className={styles.leaderboardUnit}>{valueSuffix}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
