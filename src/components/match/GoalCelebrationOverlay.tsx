import { buildAmplifyGradient } from "../../lib/goalAnimationPalette";
import type { GoalEvent } from "../../hooks/useGoalDetector";
import { PlayerPhoto } from "../player/PlayerPhoto";
import styles from "./GoalCelebrationOverlay.module.css";

type GoalCelebrationOverlayProps = {
  isActive: boolean;
  latestGoal: GoalEvent | null;
  secondsRemaining: number;
  homeTeamName: string;
  awayTeamName: string;
  scorerPhotoUrl?: string | null;
};

function formatMinute(minute?: number, minuteExtra?: number): string {
  if (minute === undefined) return "";
  if (minuteExtra !== undefined && minuteExtra > 0) return ` ${minute}+${minuteExtra}'`;
  return ` ${minute}'`;
}

function resolveScorerLabel(
  latestGoal: GoalEvent,
  homeTeamName: string,
  awayTeamName: string
): string {
  const trimmed = latestGoal.playerName?.trim();
  if (trimmed) return trimmed;

  if (latestGoal.scoringTeamId === "home") return homeTeamName;
  if (latestGoal.scoringTeamId === "away") return awayTeamName;
  return "";
}

export function GoalCelebrationOverlay({
  isActive,
  latestGoal,
  secondsRemaining,
  homeTeamName,
  awayTeamName,
  scorerPhotoUrl,
}: GoalCelebrationOverlayProps) {
  if (!isActive) return null;

  const scorerName = latestGoal ? resolveScorerLabel(latestGoal, homeTeamName, awayTeamName) : "";

  return (
    <>
      <div
        className={styles.amplifyBurst}
        aria-hidden="true"
        style={{ background: buildAmplifyGradient() }}
      />

      {latestGoal ? (
        <div className={styles.goalBanner} role="status" aria-live="polite">
          <span className={styles.goalWord}>GOAL</span>
          <span className={styles.goalDetail}>
            {scorerPhotoUrl || scorerName ? (
              <span className={styles.goalScorer}>
                <PlayerPhoto
                  name={scorerName || "Scorer"}
                  photoUrl={scorerPhotoUrl}
                  size="sm"
                  className={styles.goalScorerPhoto}
                />
                <span className={styles.goalScorerName}>
                  {scorerName}
                  {formatMinute(latestGoal.minute, latestGoal.minuteExtra)}
                </span>
              </span>
            ) : (
              <>
                {scorerName}
                {formatMinute(latestGoal.minute, latestGoal.minuteExtra)}
              </>
            )}
          </span>
          <span className={styles.countdownPip}>{secondsRemaining}s</span>
        </div>
      ) : null}
    </>
  );
}
