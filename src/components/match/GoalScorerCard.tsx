import type { GoalScorerProfile } from "../../types";
import { PlayerPhoto } from "../player/PlayerPhoto";
import styles from "./GoalScorersPanel.module.css";

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
  return (
    <PlayerPhoto
      name={profile.displayName}
      photoUrl={profile.photoUrl}
      size={size}
      loading={loading}
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
    <article className={styles.card} aria-label={`Goal by ${profile.displayName}`}>
      <div className={styles.cardHeader}>
        <PlayerAvatar profile={profile} loading={loading} />
        <div className={styles.headerText}>
          <h3 className={styles.playerName}>
            {profile.displayName}
            {profile.isOwnGoal ? <span className={styles.ogBadge}>OG</span> : null}
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
        <StatCell label="Age" value={profile.age} />
        <StatCell label="Hometown" value={profile.hometown} />
        <StatCell label="Club" value={profile.currentClub} />
        <StatCell label="WC 2026 goals" value={profile.tournamentGoals} />
        <StatCell label="Intl. goals" value={profile.internationalGoals} />
        <StatCell label="Intl. caps" value={profile.internationalAppearances} />
      </div>

      {!profile.photoUrl && !profile.age && !profile.currentClub ? (
        <p className={styles.placeholderNote}>
          Player photo and career stats will appear when roster data is available from the feed.
        </p>
      ) : null}
    </article>
  );
}
