import type { MergedMatch } from "../types";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric"
});

export type DayGroup = {
  label: string;
  date: string;
  matches: MergedMatch[];
};

function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDateKeyFromIso(isoDate: string): string {
  return localDateKeyFromDate(new Date(isoDate));
}

type Bucket = {
  label: string;
  matches: MergedMatch[];
};

/** Groups upcoming matches by local calendar day with a 4-hour "Tonight" window. */
export function groupMatchesByDay(
  matches: MergedMatch[],
  referenceNow?: Date
): DayGroup[] {
  const now = referenceNow ?? new Date();
  const fourHourCutoff = now.getTime() + FOUR_HOURS_MS;
  const todayKey = localDateKeyFromDate(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKeyFromDate(tomorrow);

  const upcoming = matches.filter((m) => m.status !== "completed" && !m.locked);
  const buckets = new Map<string, Bucket>();

  for (const match of upcoming) {
    const kickoffMs = Date.parse(match.date);
    const matchDateKey = localDateKeyFromIso(match.date);

    let bucketKey: string;
    let label: string;

    if (kickoffMs <= fourHourCutoff) {
      bucketKey = todayKey;
      label = "Today";
    } else if (matchDateKey === todayKey) {
      bucketKey = todayKey;
      label = "Today";
    } else if (matchDateKey === tomorrowKey) {
      bucketKey = tomorrowKey;
      label = "Tomorrow";
    } else {
      bucketKey = matchDateKey;
      label = dateLabelFormatter.format(new Date(match.date));
    }

    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      buckets.set(bucketKey, { label, matches: [match] });
    }
  }

  return [...buckets.entries()]
    .map(([date, bucket]) => ({
      date,
      label: bucket.label,
      matches: [...bucket.matches].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
