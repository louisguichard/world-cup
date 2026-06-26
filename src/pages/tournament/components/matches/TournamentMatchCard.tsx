import type { MergedMatch } from "../../../../types";
import { formatKickoffTime } from "../../../../lib/formatKickoff";
import { formatLiveClock } from "../../../../lib/formatMatchClock";
import { teamDisplayName } from "../../../../lib/teamIdentity";
import { useStore } from "../../../../store";
import { VenueLabel } from "../../../../components/venue/VenueLabel";
import styles from "../../TournamentView.module.css";

type Props = {
  match: MergedMatch;
};

export function TournamentMatchCard({ match }: Props) {
  const teams = useStore((s) => s.teams);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const tournamentSubTab = useStore((s) => s.tournamentSubTab);
  const selectedDateKey = useStore((s) => s.selectedDateKey);

  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const homeTeamName = teamDisplayName(home, match.homeTeamId);
  const awayTeamName = teamDisplayName(away, match.awayTeamId);

  const isLive = match.status === "live";
  const isDone = match.status === "completed";

  const handleClick = () => {
    const scrollY = window.scrollY;
    openMatchDetail(match.matchId ?? match.id, {
      from: "tournament",
      tournamentSubTab,
      scrollY,
      dateKey: selectedDateKey ?? undefined
    });
  };

  return (
    <button
      type="button"
      className={styles.matchCard}
      onClick={handleClick}
      aria-label={`${homeTeamName} vs ${awayTeamName}`}
    >
      {/* Time / status */}
      <div className={styles.matchCardTime}>
        {isLive ? (
          <div className={styles.matchCardTimeLive}>
            <span className={styles.matchCardLiveDot} aria-hidden />
            <span className={styles.matchCardLiveClock}>
              {formatLiveClock(match)}
            </span>
          </div>
        ) : isDone ? (
          <span className={styles.matchCardFt}>FT</span>
        ) : (
          <span className={styles.matchCardTimeLabel}>
            {formatKickoffTime(match.date)}
          </span>
        )}
        <VenueLabel
          matchId={match.matchId ?? match.id}
          venueString={match.venue}
          compact
        />
      </div>

      {/* Score / teams */}
      <div className={styles.matchCardBody}>
        <div className={styles.matchCardScoreLine}>
          <span className={`${styles.matchCardTeam} team-name-text`}>{homeTeamName}</span>
          {isLive || isDone ? (
            <span className={styles.matchCardScore}>
              <span>{match.homeScore ?? 0}</span>
              <span className={styles.matchCardScoreSep}>:</span>
              <span>{match.awayScore ?? 0}</span>
            </span>
          ) : (
            <span className={styles.matchCardVs}>–</span>
          )}
          <span className={`${styles.matchCardTeam} ${styles["matchCardTeam--away"]} team-name-text`}>
            {awayTeamName}
          </span>
        </div>
      </div>

      <span className={styles.matchCardArrow}>›</span>
    </button>
  );
}
