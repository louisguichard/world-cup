import { resolveTeamFromStore } from "../../../../data/wc2026TeamCatalog";
import type { Team, TournamentPlayerStat } from "../../../../types";
import { teamLabel } from "../../../../lib/aggregateTournamentStats";
import { wcCareerGoalsForDisplay } from "../../../../lib/mergeWcCareerGoals";
import { useEnrichedPlayerPhoto } from "../../../../hooks/useEnrichedPlayerPhoto";
import { TeamFlag } from "../../../../components/team/TeamFlag";
import { TeamClickTarget } from "../../../../components/team/TeamClickTarget";
import { PlayerPhoto } from "../../../../components/player/PlayerPhoto";
import styles from "../../TournamentView.module.css";

type Props = {
  title: string;
  stats: TournamentPlayerStat[];
  teams: Record<string, Team>;
  unit?: string;
  /** When set, shows World Cup career totals from the reference merge. */
  topScorers2026?: TournamentPlayerStat[];
};

function LeaderboardRow({
  stat,
  rank,
  teams,
  unit,
  topScorers2026,
}: {
  stat: TournamentPlayerStat;
  rank: number;
  teams: Record<string, Team>;
  unit: string;
  topScorers2026?: TournamentPlayerStat[];
}) {
  const team = resolveTeamFromStore(teams, stat.teamId);
  const photoUrl = useEnrichedPlayerPhoto(
    stat.player.displayName,
    stat.teamId,
    stat.player.id
  );
  const wcCareer =
    topScorers2026 != null
      ? wcCareerGoalsForDisplay(stat.player.displayName, topScorers2026)
      : undefined;

  return (
    <li className={styles.leaderboardRow}>
      <span className={styles.leaderboardRank}>{rank}</span>
      <TeamFlag team={team} teamId={stat.teamId} size="sm" />
      <div className={styles.leaderboardMeta}>
        <span className={styles.leaderboardNameRow}>
          <PlayerPhoto name={stat.player.displayName} photoUrl={photoUrl} size="sm" />
          <span className={styles.leaderboardName}>{stat.player.displayName}</span>
        </span>
        <TeamClickTarget teamId={stat.teamId} className={styles.leaderboardTeamBtn}>
          <span className={styles.leaderboardTeam}>{teamLabel(stat.teamId, teams)}</span>
        </TeamClickTarget>
      </div>
      <div className={styles.leaderboardValues}>
        <span className={styles.leaderboardValue}>
          {stat.value}
          <span className={styles.leaderboardUnit}>{unit}</span>
        </span>
        {wcCareer != null ? (
          <span className={styles.leaderboardCareer} title="World Cup career goals">
            {wcCareer}
            <span className={styles.leaderboardCareerUnit}>WC</span>
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function TournamentLeaderboard({
  title,
  stats,
  teams,
  unit = "G",
  topScorers2026,
}: Props) {
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
        {stats.slice(0, 15).map((stat, i) => (
          <LeaderboardRow
            key={`${stat.player.id}-${stat.teamId}`}
            stat={stat}
            rank={i + 1}
            teams={teams}
            unit={unit}
            topScorers2026={topScorers2026}
          />
        ))}
      </ol>
    </section>
  );
}
