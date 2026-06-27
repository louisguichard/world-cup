import type { Team } from "../../../../types";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  teamDisplayNameForMatch,
} from "../../../../lib/matchTeamDisplay";
import { formatKickoffDate } from "../../../../lib/formatKickoff";
import { awardKindLabel, type CompletedMatchAwards } from "../../../../lib/deriveMatchAwards";
import { TeamFlag } from "../../../../components/team/TeamFlag";
import { TeamClickTarget } from "../../../../components/team/TeamClickTarget";
import { PlayerPhoto } from "../../../../components/player/PlayerPhoto";
import styles from "../../TournamentView.module.css";

type Props = {
  rows: CompletedMatchAwards[];
  teams: Record<string, Team>;
  onOpenMatch: (matchId: string) => void;
};

export function MatchAwardsFeed({ rows, teams, onOpenMatch }: Props) {
  if (rows.length === 0) {
    return (
      <section className={styles.statsSection}>
        <h3 className={styles.statsSectionTitle}>Match awards</h3>
        <p className={styles.statsEmptyNote}>
          Completed fixtures will show Man of the Match and other awards here once results are in.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.statsSection}>
      <h3 className={styles.statsSectionTitle}>Match awards</h3>
      <p className={styles.statsSectionNote}>
        Man of the Match and standout performances for each completed fixture. Official FIFA awards
        will replace projected picks when published.
      </p>
      <ul className={styles.awardsFeed}>
        {rows.map(({ match, matchId, awards }) => {
          const home = resolveMatchTeam(match, "home", teams);
          const away = resolveMatchTeam(match, "away", teams);
          const homeName = teamDisplayNameForMatch(match, "home", teams);
          const awayName = teamDisplayNameForMatch(match, "away", teams);
          const score = `${match.homeScore ?? 0}–${match.awayScore ?? 0}`;

          return (
            <li key={matchId} className={styles.awardsFeedItem}>
              <button
                type="button"
                className={styles.awardsFeedMatch}
                onClick={() => onOpenMatch(match.matchId ?? match.id)}
              >
                <div className={styles.awardsFeedMeta}>
                  <time dateTime={match.date}>{formatKickoffDate(match.date)}</time>
                  {match.group ? <span>Group {match.group}</span> : null}
                  {match.stage ? <span>{match.stage}</span> : null}
                </div>
                <div className={styles.awardsFeedScoreline}>
                  <TeamFlag team={home} teamId={flagTeamIdForMatch(match, "home", teams)} size="sm" />
                  <TeamClickTarget teamId={home?.id ?? match.homeTeamId} className={styles.awardsFeedTeamBtn}>
                    <span className={styles.awardsFeedTeam}>{homeName}</span>
                  </TeamClickTarget>
                  <span className={styles.awardsFeedScore}>{score}</span>
                  <TeamClickTarget teamId={away?.id ?? match.awayTeamId} className={styles.awardsFeedTeamBtn}>
                    <span className={styles.awardsFeedTeam}>{awayName}</span>
                  </TeamClickTarget>
                  <TeamFlag team={away} teamId={flagTeamIdForMatch(match, "away", teams)} size="sm" />
                </div>
              </button>

              <div className={styles.awardsFeedBadges}>
                {awards.length > 0 ? (
                  awards.map((award) => (
                    <div key={`${award.kind}-${award.playerName}`} className={styles.awardBadge}>
                      <PlayerPhoto name={award.playerName} size="md" />
                      <span className={styles.awardBadgeKind}>{awardKindLabel(award.kind)}</span>
                      <span className={styles.awardBadgePlayer}>{award.playerName}</span>
                      {award.detail ? (
                        <span className={styles.awardBadgeDetail}>{award.detail}</span>
                      ) : null}
                      {award.source === "derived" ? (
                        <span className={styles.awardBadgeSource}>Projected</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className={`${styles.awardBadge} ${styles.awardBadgePending}`}>
                    <span className={styles.awardBadgeKind}>Awards pending</span>
                    <span className={styles.awardBadgeDetail}>
                      MOTM and official honors will appear when event data is available
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
