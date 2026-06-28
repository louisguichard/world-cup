import type { GoalScorerProfile, Team } from "../../types";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { GoalScorerCard } from "./GoalScorerCard";
import styles from "./GoalScorersPanel.module.css";

type Props = {
  profiles: GoalScorerProfile[];
  homeTeam?: Team;
  awayTeam?: Team;
  loading?: boolean;
};

export function GoalScorersPanel({ profiles, homeTeam, awayTeam, loading }: Props) {
  if (profiles.length === 0 && !loading) return null;

  const teamName = (teamId: string) => {
    const team = teamId === homeTeam?.id ? homeTeam : awayTeam;
    return teamDisplayNameFromId(teamId, {
      ...(homeTeam ? { [homeTeam.id]: homeTeam } : {}),
      ...(awayTeam ? { [awayTeam.id]: awayTeam } : {}),
    });
  };

  return (
    <section className={styles.panel} aria-label="Goal scorers">
      <h2 className={styles.panelTitle}>Goal scorers</h2>
      {loading && profiles.length === 0 ? (
        <div className={styles.skeletonGrid}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.skeletonCard} aria-hidden />
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {profiles.map((profile) => (
            <GoalScorerCard
              key={profile.eventId}
              profile={profile}
              teamName={teamName(profile.teamId)}
              loading={loading}
            />
          ))}
        </div>
      )}
    </section>
  );
}
