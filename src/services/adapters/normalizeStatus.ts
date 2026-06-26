import type { MatchStatus } from "../../types";

/** Maps arbitrary API status strings to the app's MatchStatus union. */
export function mapExternalStatus(raw: unknown): MatchStatus | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.toLowerCase().trim();

  if (
    s === "live" ||
    s === "inprogress" ||
    s === "in" ||
    s === "ongoing" ||
    s.includes("live")
  ) {
    return "live";
  }
  if (
    s === "completed" ||
    s === "finished" ||
    s === "post" ||
    s === "ft" ||
    s === "full_time" ||
    s.includes("final")
  ) {
    return "completed";
  }
  if (s === "scheduled" || s === "notstarted" || s === "not_started" || s === "pre") {
    return "scheduled";
  }
  if (s === "postponed") return "postponed";
  if (s === "interrupted" || s === "suspended") return "interrupted";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return undefined;
}

/** Parses a score value from number or numeric string. */
export function parseScoreValue(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Parses clock minute from string like "45+2" or number. */
export function parseClockMinute(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === "string") {
    const match = raw.match(/^(\d+)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Normalizes a date field to UTC ISO-8601. */
export function toUtcIso(raw: unknown): string | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const ms = Date.parse(String(raw));
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}
