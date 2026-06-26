import type { TeamStats } from "../types";

const MIN_RATING = 0;
const MAX_RATING = 10;

export type PlayerRatingInput = {
  minutesPlayed: number;
  goals?: number;
  assists?: number;
  shotsOnTarget?: number;
  keyPasses?: number;
  tackles?: number;
  interceptions?: number;
  yellowCards?: number;
  redCards?: number;
  saves?: number;
  goalsConceded?: number;
};

/**
 * Derive a 0–10 player rating from available statistical contributions.
 * This is a weighted heuristic — not a provider-sourced rating.
 */
export function derivePlayerRating(input: PlayerRatingInput): number {
  if (input.minutesPlayed < 1) return MIN_RATING;

  // Base rating normalised by minutes
  const minuteFraction = Math.min(input.minutesPlayed / 90, 1);
  let score = 6.0 * minuteFraction;

  // Attacking contributions
  score += (input.goals ?? 0) * 1.5;
  score += (input.assists ?? 0) * 0.8;
  score += (input.shotsOnTarget ?? 0) * 0.2;
  score += (input.keyPasses ?? 0) * 0.15;

  // Defensive contributions
  score += (input.tackles ?? 0) * 0.1;
  score += (input.interceptions ?? 0) * 0.1;

  // GK specific
  score += (input.saves ?? 0) * 0.3;
  score -= (input.goalsConceded ?? 0) * 0.4;

  // Disciplinary penalties
  score -= (input.yellowCards ?? 0) * 0.5;
  score -= (input.redCards ?? 0) * 2.0;

  return Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(score * 10) / 10));
}

/**
 * Derive a rough team-level "pressure" score from aggregate stats.
 * Used as a fallback when individual player ratings are unavailable.
 */
export function deriveTeamPressure(stats: TeamStats): number {
  const shots = stats.totalShots ?? 0;
  const onTarget = stats.shotsOnTarget ?? 0;
  const xg = stats.expectedGoals ?? 0;
  const corners = stats.corners ?? 0;
  const possession = stats.ballPossession ?? 50;

  const raw =
    shots * 0.5 +
    onTarget * 1.0 +
    xg * 3.0 +
    corners * 0.3 +
    (possession / 100) * 2.0;

  return Math.max(MIN_RATING, Math.min(MAX_RATING, Math.round(raw * 10) / 10));
}
