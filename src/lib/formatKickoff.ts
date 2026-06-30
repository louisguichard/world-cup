function parseIso(isoDate: string): Date | null {
  if (!isoDate.trim()) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: localTimeZone
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: localTimeZone
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: localTimeZone
});

/**
 * Formats a match ISO date string to official kickoff display.
 * Completed matches show date only; upcoming/live show date + time.
 */
export function formatKickoff(isoDate: string, isCompleted = false): string {
  const datePart = formatKickoffDate(isoDate);
  if (!datePart) return "";
  if (isCompleted) return datePart;

  const timePart = formatKickoffTime(isoDate);
  if (!timePart) return datePart;
  return `${datePart} · ${timePart}`;
}

/** Returns just the time portion for live/upcoming match cards. */
export function formatKickoffTime(isoDate: string): string {
  const date = parseIso(isoDate);
  if (!date) return "";
  return timeFormatter.format(date);
}

/** Returns just the date portion. */
export function formatKickoffDate(isoDate: string): string {
  const date = parseIso(isoDate);
  if (!date) return "";
  return dateFormatter.format(date);
}

/** Returns "June 11" style — for compact venue rows, timeline, bracket headers. */
export function formatMatchDateCompact(isoDate: string): string {
  const date = parseIso(isoDate);
  if (!date) return "";
  return compactDateFormatter.format(date);
}
