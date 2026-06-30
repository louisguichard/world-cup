import type { CSSProperties, ReactNode } from "react";
import type { MergedMatch, PenaltyShootout, Team } from "../../types";
import { APP_COPY } from "../../lib/appCopy";
import { penaltyResultAriaLabel } from "../../lib/formatPenaltyResultLine";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
  teamDisplayNameForMatch,
} from "../../lib/matchTeamDisplay";
import { resolveCanonicalTeamId } from "../../data/wc2026TeamCatalog";
import { resolveTeamIdentity } from "../../lib/teamIdentity";
import { TeamFlag } from "../team/TeamFlag";
import styles from "./KnockoutResultScoreboard.module.css";

type Props = {
  match: MergedMatch;
  shootout: PenaltyShootout;
  teams: Record<string, Team>;
  winnerTeamId?: string;
  stageLabel?: string;
  compact?: boolean;
  meta?: ReactNode;
  loading?: boolean;
};

function KitDot({ team }: { team?: Team }) {
  const identity = resolveTeamIdentity(team);
  const style: CSSProperties = {
    background: identity?.primary ?? "var(--muted)",
  };
  return <span className={styles.kitDot} style={style} aria-hidden title="Kit color" />;
}

function TeamSide({
  match,
  side,
  teams,
  advancing,
  compact,
}: {
  match: MergedMatch;
  side: "home" | "away";
  teams: Record<string, Team>;
  advancing: boolean;
  compact?: boolean;
}) {
  const team = resolveMatchTeam(match, side, teams);
  const teamId = flagTeamIdForMatch(match, side, teams);
  const name = teamDisplayNameForMatch(match, side, teams);
  const nameHint = scheduleNameHintForMatch(match, side);

  return (
    <div
      className={`${styles.teamSide} ${side === "away" ? styles.teamSideAway : ""} ${advancing ? styles.advancing : ""}`}
    >
      <div className={styles.teamFlagRow}>
        <KitDot team={team} />
        <TeamFlag team={team} teamId={teamId} nameHint={nameHint} size={compact ? "sm" : "lg"} compact />
      </div>
      <span className={styles.teamName}>{name}</span>
    </div>
  );
}

export function KnockoutResultScoreboard({
  match,
  shootout,
  teams,
  winnerTeamId,
  stageLabel,
  compact,
  meta,
  loading,
}: Props) {
  const homeFt = match.homeScore ?? 0;
  const awayFt = match.awayScore ?? 0;
  const homeCanon = resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
  const awayCanon = resolveCanonicalTeamId(match.awayTeamId, teams[match.awayTeamId]);
  const winner = winnerTeamId;
  const homeWonPens =
    !loading &&
    Boolean(winner && winner === homeCanon && shootout.homeScore !== shootout.awayScore);
  const awayWonPens =
    !loading &&
    Boolean(winner && winner === awayCanon && shootout.homeScore !== shootout.awayScore);
  const homeAdvancing = Boolean(winner && winner === homeCanon);
  const awayAdvancing = Boolean(winner && winner === awayCanon);

  const penLabel = loading
    ? { prefix: "Penalties:", home: "…", sep: "–", away: "…" }
    : APP_COPY.match.penaltiesLine(shootout.homeScore, shootout.awayScore);

  return (
    <div className={`${styles.knockoutScoreboard} ${compact ? styles.compact : ""}`}>
      <TeamSide match={match} side="home" teams={teams} advancing={homeAdvancing} compact={compact} />

      <div
        className={styles.center}
        aria-label={penaltyResultAriaLabel(homeFt, awayFt, shootout.homeScore, shootout.awayScore)}
      >
        <div className={styles.ftScore}>
          <span>{homeFt}</span>
          <span className={styles.ftSep}>–</span>
          <span>{awayFt}</span>
        </div>
        <div className={styles.penalties}>
          <span className={styles.penaltiesPrefix}>{penLabel.prefix}</span>
          <span className={homeWonPens ? styles.penScoreWinner : styles.penScore}>{penLabel.home}</span>
          <span className={styles.penSep}>{penLabel.sep}</span>
          <span className={awayWonPens ? styles.penScoreWinner : styles.penScore}>{penLabel.away}</span>
        </div>
        {stageLabel ? <span className={styles.stage}>{stageLabel}</span> : null}
      </div>

      <TeamSide match={match} side="away" teams={teams} advancing={awayAdvancing} compact={compact} />

      {meta ? <div className={styles.metaRow}>{meta}</div> : null}
    </div>
  );
}
