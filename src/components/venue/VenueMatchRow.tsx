import { formatKickoffTime } from "../../lib/formatKickoff";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { APP_COPY } from "../../lib/appCopy";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { MergedMatch, Team } from "../../types";
import styles from "./VenueMatchRow.module.css";

type Props = {
  match: MergedMatch;
  home?: Team;
  away?: Team;
  onSelect?: () => void;
};

function statusBadge(match: MergedMatch): { label: string; className: string } {
  if (match.status === "live") {
    return {
      label: formatLiveClock(match) || APP_COPY.match.live,
      className: styles["statusBadge--live"],
    };
  }
  if (match.status === "completed" || match.locked) {
    return { label: APP_COPY.match.final, className: styles["statusBadge--ft"] };
  }
  return { label: "Coming up", className: styles["statusBadge--scheduled"] };
}

export function VenueMatchRow({ match, home, away, onSelect }: Props) {
  const homeName = teamDisplayName(home, match.homeTeamId);
  const awayName = teamDisplayName(away, match.awayTeamId);
  const badge = statusBadge(match);
  const isScored = match.status === "live" || match.status === "completed" || match.locked;
  const stageLabel = match.stage ?? (match.group ? `Group ${match.group}` : match.matchId ?? match.id);

  const content = (
    <>
      <div className={styles.venueMatchRowHead}>
        <span className={styles.venueMatchTitle}>
          {homeName} vs {awayName}
        </span>
        <span className={`${styles.statusBadge} ${badge.className}`}>{badge.label}</span>
      </div>
      <div className={styles.venueMatchMeta}>
        <time dateTime={match.date}>{formatKickoffTime(match.date)}</time>
        <span className={styles.venueMatchStage}>{stageLabel}</span>
      </div>
      {isScored ? (
        <div className={styles.venueMatchScore}>
          {match.homeScore ?? 0} – {match.awayScore ?? 0}
        </div>
      ) : null}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={styles.venueMatchRow} onClick={onSelect}>
        {content}
      </button>
    );
  }

  return <article className={styles.venueMatchRow}>{content}</article>;
}
