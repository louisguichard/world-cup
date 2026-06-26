export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function localDateKey(date: Date, timeZone = localTimeZone()): string {
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

export function yesterdayDateKey(now = new Date(), timeZone = localTimeZone()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return localDateKey(d, timeZone);
}

export function formatTimeAgo(completedAt: string, now = new Date()): string {
  const ms = now.getTime() - Date.parse(completedAt);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return "Yesterday";
}
