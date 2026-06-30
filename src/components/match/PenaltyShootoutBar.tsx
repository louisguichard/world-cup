import type { MergedMatch, PenaltyKick, PenaltyShootout, Team } from "../../types";
import { TeamFlag } from "../team/TeamFlag";
import styles from "./PenaltyShootoutBar.module.css";

type Props = {
  match: MergedMatch;
  shootout: PenaltyShootout;
  homeTeam?: Team;
  awayTeam?: Team;
  compact?: boolean;
  isLive?: boolean;
};

type ActiveSide = "home" | "away" | null;

function resolveActiveSide(shootout: PenaltyShootout, isLive: boolean): ActiveSide {
  if (!isLive) return null;
  const totalKicks = shootout.home.length + shootout.away.length;
  return totalKicks % 2 === 0 ? "home" : "away";
}

function KickDot({
  kick,
  isActive,
  isSuddenDeath,
}: {
  kick: PenaltyKick;
  isActive: boolean;
  isSuddenDeath: boolean;
}) {
  const title = [kick.playerName, isSuddenDeath ? "Sudden death" : undefined]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`${styles.kick} ${kick.scored ? styles.kickScored : styles.kickMissed}${isActive ? ` ${styles.kickActive}` : ""}`}
      title={title || undefined}
      aria-hidden
    />
  );
}

function PendingKick({ isSuddenDeath }: { isSuddenDeath: boolean }) {
  return (
    <span
      className={`${styles.kick} ${styles.kickPending}`}
      title={isSuddenDeath ? "Sudden death" : "Next kick"}
      aria-hidden
    />
  );
}

export function PenaltyShootoutBar({
  match,
  shootout,
  homeTeam,
  awayTeam,
  compact,
  isLive = false,
}: Props) {
  const homeFt = match.homeScore ?? 0;
  const awayFt = match.awayScore ?? 0;
  const isSuddenDeath = Math.max(shootout.home.length, shootout.away.length) > 5;
  const activeSide = resolveActiveSide(shootout, isLive);
  const headerLabel = isSuddenDeath ? "Sudden death" : "Penalty shootout";
  const label = `FT ${homeFt}–${awayFt} · Pens ${shootout.homeScore}–${shootout.awayScore}`;

  return (
    <div className={`${styles.bar} ${compact ? styles.barCompact : ""}`} aria-label={label}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{headerLabel}</span>
        <span className={styles.headerScore}>
          {shootout.homeScore} – {shootout.awayScore}
        </span>
      </div>

      <div className={styles.rows}>
        <div
          className={`${styles.teamRow} ${activeSide === "home" ? styles.teamRowActive : ""}`.trim()}
        >
          <TeamFlag team={homeTeam} teamId={match.homeTeamId} size="sm" compact />
          <span className={styles.teamName}>{homeTeam?.shortName ?? "Home"}</span>
          <div className={styles.kicks}>
            {shootout.home.map((kick, i) => (
              <KickDot
                key={`h-${i}`}
                kick={kick}
                isActive={false}
                isSuddenDeath={isSuddenDeath && i >= 5}
              />
            ))}
            {activeSide === "home" ? <PendingKick isSuddenDeath={isSuddenDeath} /> : null}
          </div>
          <span className={styles.teamTally}>{shootout.homeScore}</span>
        </div>

        <div
          className={`${styles.teamRow} ${activeSide === "away" ? styles.teamRowActive : ""}`.trim()}
        >
          <TeamFlag team={awayTeam} teamId={match.awayTeamId} size="sm" compact />
          <span className={styles.teamName}>{awayTeam?.shortName ?? "Away"}</span>
          <div className={styles.kicks}>
            {shootout.away.map((kick, i) => (
              <KickDot
                key={`a-${i}`}
                kick={kick}
                isActive={false}
                isSuddenDeath={isSuddenDeath && i >= 5}
              />
            ))}
            {activeSide === "away" ? <PendingKick isSuddenDeath={isSuddenDeath} /> : null}
          </div>
          <span className={styles.teamTally}>{shootout.awayScore}</span>
        </div>
      </div>

      <span className={styles.label}>{label}</span>
    </div>
  );
}

export function penaltyShootoutForMatch(match: MergedMatch): PenaltyShootout | undefined {
  return match.penaltyShootout;
}
