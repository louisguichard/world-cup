import type { MatchEvent, MomentumInterval } from "../../types";

const BUCKET_SIZE = 5; // minutes per interval
const TOTAL_MINUTES = 90;

// Weight each event type for momentum calculation
const EVENT_WEIGHTS: Partial<Record<import("../../types").MatchEventType, number>> = {
  goal: 6,
  own_goal: 4,
  penalty_missed: 3,
  penalty_saved: 3,
  yellow_card: 1,
  red_card: 2,
  var_review: 1,
  substitution: 0
};

type BucketAccumulator = {
  home: number;
  away: number;
};

/**
 * Derive coarse momentum buckets from match events.
 * Each bucket represents BUCKET_SIZE minutes.
 * Home/away values represent offensive pressure (0–10 each).
 */
export function deriveMomentum(
  events: MatchEvent[],
  homeTeamId: string
): MomentumInterval[] {
  const bucketCount = Math.ceil(TOTAL_MINUTES / BUCKET_SIZE);
  const buckets: BucketAccumulator[] = Array.from({ length: bucketCount }, () => ({
    home: 0,
    away: 0
  }));

  for (const event of events) {
    if (event.minute < 0 || event.minute > TOTAL_MINUTES + 15) continue;
    const weight = EVENT_WEIGHTS[event.type] ?? 0;
    if (weight === 0) continue;

    const bucketIndex = Math.min(
      Math.floor(event.minute / BUCKET_SIZE),
      bucketCount - 1
    );
    if (event.teamId === homeTeamId) {
      buckets[bucketIndex].home += weight;
    } else {
      buckets[bucketIndex].away += weight;
    }
  }

  // Normalize to 0–10 scale per bucket
  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.home, b.away)));

  return buckets.map((bucket, i) => ({
    startMinute: i * BUCKET_SIZE,
    endMinute: Math.min((i + 1) * BUCKET_SIZE, TOTAL_MINUTES),
    homeValue: Math.round((bucket.home / maxVal) * 10),
    awayValue: Math.round((bucket.away / maxVal) * 10)
  }));
}
