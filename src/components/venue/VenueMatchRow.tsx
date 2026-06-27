import { formatKickoffTime } from "../../lib/formatKickoff";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { APP_COPY } from "../../lib/appCopy";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
  teamDisplayNameForMatch,
} from "../../lib/matchTeamDisplay";
import type { MergedMatch, Team } from "../../types";
import { TeamFlag } from "../team/TeamFlag";
import { useStore } from "../../store";
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
  const teams = useStore((s) => s.teams);
  const resolvedHome = home ?? resolveMatchTeam(match, "home", teams);
  const resolvedAway = away ?? resolveMatchTeam(match, "away", teams);
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
  const badge = statusBadge(match);
  const isScored = match.status === "live" || match.status === "completed" || match.locked;
  const stageLabel = match.stage ?? (match.group ? `Group ${match.group}` : match.matchId ?? match.id);

  const content = (
    <>
      <div className={styles.venueMatchRowHead}>
        <span className={styles.venueMatchTitle}>
          <span className={styles.venueMatchTeam}>
            <TeamFlag
              team={resolvedHome}
              teamId={flagTeamIdForMatch(match, "home", teams)}
              nameHint={scheduleNameHintForMatch(match, "home")}
              size="sm"
              compact
            />
            <span className="team-name-text">{homeName}</span>
          </span>
          <span className={styles.venueMatchVs}>vs</span>
          <span className={styles.venueMatchTeam}>
            <TeamFlag
              team={resolvedAway}
              teamId={flagTeamIdForMatch(match, "away", teams)}
              nameHint={scheduleNameHintForMatch(match, "away")}
              size="sm"
              compact
            />
            <span className="team-name-text">{awayName}</span>
          </span>
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
