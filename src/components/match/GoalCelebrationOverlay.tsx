import { buildAmplifyGradient } from "../../lib/goalAnimationPalette";
import type { GoalEvent } from "../../hooks/useGoalDetector";
import styles from "./GoalCelebrationOverlay.module.css";

type GoalCelebrationOverlayProps = {
  isActive: boolean;
  latestGoal: GoalEvent | null;
  secondsRemaining: number;
  homeTeamName: string;
  awayTeamName: string;
};

function formatMinute(minute?: number, minuteExtra?: number): string {
  if (minute === undefined) return "";
  if (minuteExtra !== undefined && minuteExtra > 0) return ` ${minute}+${minuteExtra}'`;
  return ` ${minute}'`;
}

export function GoalCelebrationOverlay({
  isActive,
  latestGoal,
  secondsRemaining,
  homeTeamName,
  awayTeamName,
}: GoalCelebrationOverlayProps) {
  if (!isActive) return null;

  const scorerName =
    latestGoal?.scoringTeamId === "home"
      ? homeTeamName
      : latestGoal?.scoringTeamId === "away"
        ? awayTeamName
        : "";

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
            {scorerName}
            {formatMinute(latestGoal.minute, latestGoal.minuteExtra)}
          </span>
          <span className={styles.countdownPip}>{secondsRemaining}s</span>
        </div>
      ) : null}
    </>
  );
}
