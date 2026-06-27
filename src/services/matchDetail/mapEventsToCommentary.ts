import type { MatchEvent } from "../../types";
import type { WcCommentaryEntry } from "../WorldCup2026LiveClient";

function eventText(event: MatchEvent): string {
  switch (event.type) {
    case "goal":
      return event.assistName
        ? `Goal! ${event.playerName} (assist: ${event.assistName})`
        : `Goal! ${event.playerName}`;
    case "own_goal":
      return `Own goal — ${event.playerName}`;
    case "substitution":
      return event.assistName
        ? `Substitution: ${event.playerName} on, ${event.assistName} off`
        : `Substitution: ${event.playerName}`;
    case "yellow_card":
      return `Yellow card — ${event.playerName}`;
    case "red_card":
      return `Red card — ${event.playerName}`;
    case "yellow_red_card":
      return `Second yellow — ${event.playerName} sent off`;
    case "var_review":
      return `VAR review${event.varOutcome ? ` (${event.varOutcome})` : ""}`;
    case "goal_disallowed":
      return `Goal disallowed — ${event.playerName}`;
    case "penalty_missed":
      return `Penalty missed — ${event.playerName}`;
    case "penalty_saved":
      return `Penalty saved — ${event.playerName}`;
    default: {
      const _exhaustive: never = event.type;
      return String(_exhaustive);
    }
  }
}

/** Derives commentary rows from structured match events when no feed is available. */
export function mapEventsToCommentary(events: MatchEvent[]): WcCommentaryEntry[] {
  return events
    .slice()
    .sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0))
    .map((event) => ({
      minute: event.minuteExtra ? `${event.minute}+${event.minuteExtra}` : event.minute,
      text: eventText(event),
      type: event.type,
    }));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function coerceMinute(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

/** Maps SofaScore match comments to commentary entries. */
export function mapSofaCommentsToCommentary(raw: unknown): WcCommentaryEntry[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.comments)
      ? raw.comments
      : isRecord(raw) && Array.isArray(raw.data)
        ? raw.data
        : [];

  return list
    .filter(isRecord)
    .map((item) => ({
      minute: coerceMinute(item.time ?? item.minute ?? item.clock) ?? 0,
      text: String(item.text ?? item.comment ?? item.message ?? "Event"),
      type: typeof item.type === "string" ? item.type : undefined,
    }));
}
