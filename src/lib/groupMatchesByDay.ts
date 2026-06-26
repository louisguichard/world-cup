import type { MergedMatch } from "../types";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export type DayGroup = {
  label: string;
  /** YYYY-MM-DD in the user's local timezone */
  dateKey: string;
  isToday: boolean;
  isTomorrow: boolean;
  matches: MergedMatch[];
};

export type GroupMatchesOptions = {
  now?: Date;
  /** Include completed and locked matches (for ScheduleView). Defaults to false. */
  includeCompleted?: boolean;
};

function localDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric"
});

type Bucket = {
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  matches: MergedMatch[];
};

/** Groups matches by local calendar day with a 4-hour "Tonight" window. */
export function groupMatchesByDay(
  matches: MergedMatch[],
  options?: GroupMatchesOptions
): DayGroup[] {
  const now = options?.now ?? new Date();
  const includeCompleted = options?.includeCompleted ?? false;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fourHourCutoff = now.getTime() + FOUR_HOURS_MS;
  const todayKey = localDateKey(now, tz);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow, tz);

  const filtered = includeCompleted
    ? matches
    : matches.filter((m) => m.status !== "completed" && !m.locked);

  const buckets = new Map<string, Bucket>();

  for (const match of filtered) {
    const kickoffMs = Date.parse(match.date);
    const matchDateKey = localDateKey(new Date(match.date), tz);

    let bucketKey: string;
    let label: string;
    let isToday = false;
    let isTomorrow = false;

    if (kickoffMs <= fourHourCutoff || matchDateKey === todayKey) {
      bucketKey = todayKey;
      label = "Today";
      isToday = true;
    } else if (matchDateKey === tomorrowKey) {
      bucketKey = tomorrowKey;
      label = "Tomorrow";
      isTomorrow = true;
    } else {
      bucketKey = matchDateKey;
      label = dateLabelFormatter.format(new Date(match.date));
    }

    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.matches.push(match);
    } else {
      buckets.set(bucketKey, { label, isToday, isTomorrow, matches: [match] });
    }
  }

  return [...buckets.entries()]
    .map(([dateKey, bucket]) => ({
      dateKey,
      label: bucket.label,
      isToday: bucket.isToday,
      isTomorrow: bucket.isTomorrow,
      matches: [...bucket.matches].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
