/** Official FIFA World Cup 2026 tournament window (London calendar dates). */
export const WC2026_TOURNAMENT_START = "2026-06-11";
export const WC2026_TOURNAMENT_END = "2026-07-19";

export function isWithinWc2026Tournament(isoDate: string): boolean {
  const day = isoDate.slice(0, 10);
  return day >= WC2026_TOURNAMENT_START && day <= WC2026_TOURNAMENT_END;
}

/** Dates to probe during daily sync (today ±1, clamped to tournament). */
export function wc2026SyncProbeDates(now = new Date()): string[] {
  const dates = new Set<string>();
  for (const offset of [-1, 0, 1]) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    if (isWithinWc2026Tournament(iso)) dates.add(iso);
  }
  return [...dates].sort();
}
