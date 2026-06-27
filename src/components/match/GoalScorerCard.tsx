import type { GoalScorerProfile } from "../../types";
import { APP_COPY } from "../../lib/appCopy";
import { PlayerPhoto } from "../player/PlayerPhoto";
import styles from "./GoalScorersPanel.module.css";

const gs = APP_COPY.goalScorer;

type Props = {
  profile: GoalScorerProfile;
  teamName: string;
  loading?: boolean;
  compact?: boolean;
};

function StatCell({ label, value }: { label: string; value: string | number | undefined }) {
  const display = value ?? "—";
  return (
    <div className={styles.statCell}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{display}</span>
    </div>
  );
}

function PlayerAvatar({
  profile,
  loading,
  size = "md",
}: {
  profile: GoalScorerProfile;
  loading?: boolean;
  size?: "sm" | "md";
}) {
  const showSkeleton = Boolean(loading && !profile.photoUrl);

  return (
    <PlayerPhoto
      name={profile.displayName}
      photoUrl={profile.photoUrl}
      size={size}
      loading={showSkeleton}
      className={styles.avatar}
    />
  );
}

export function GoalScorerCard({ profile, teamName, loading, compact }: Props) {
  const minuteLabel = profile.minuteExtra
    ? `${profile.minute}+${profile.minuteExtra}'`
    : `${profile.minute}'`;

  if (compact) {
    return (
      <div className={styles.compactCard} title={profile.displayName}>
        <PlayerAvatar profile={profile} loading={loading} size="sm" />
        <span className={styles.compactName}>{profile.displayName}</span>
        <span className={styles.compactMinute}>{minuteLabel}</span>
      </div>
    );
  }

  return (
    <article className={styles.card} aria-label={gs.goalBy(profile.displayName)}>
      <div className={styles.cardHeader}>
        <PlayerAvatar profile={profile} loading={loading} />
        <div className={styles.headerText}>
          <h3 className={styles.playerName}>
            {profile.displayName}
            {profile.isOwnGoal ? <span className={styles.ogBadge}>{gs.ownGoalBadge}</span> : null}
          </h3>
          <p className={styles.metaLine}>
            {teamName}
            {profile.jerseyNumber ? ` · #${profile.jerseyNumber}` : ""}
            {profile.position ? ` · ${profile.position}` : ""}
          </p>
          <p className={styles.minuteLine}>{minuteLabel}</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCell label={gs.age} value={profile.age} />
        <StatCell label={gs.hometown} value={profile.hometown} />
        <StatCell label={gs.club} value={profile.currentClub} />
        <StatCell label={gs.tournamentGoals} value={profile.tournamentGoals} />
        <StatCell label={gs.internationalGoals} value={profile.internationalGoals} />
        <StatCell label={gs.internationalCaps} value={profile.internationalAppearances} />
      </div>

      {!profile.photoUrl && !profile.age && !profile.currentClub ? (
        <p className={styles.placeholderNote}>{gs.placeholderNote}</p>
      ) : null}
    </article>
  );
}
