import type { MatchEvent, MatchEventType } from "../../types";
import type { WcCommentaryEntry } from "../WorldCup2026LiveClient";

function parseMinute(raw: string | number | undefined): { minute: number; minuteExtra?: number } {
  if (typeof raw === "number") return { minute: raw };
  const text = String(raw ?? "0");
  const match = text.match(/(\d+)(?:\+(\d+))?/);
  if (!match) return { minute: 0 };
  return { minute: Number(match[1]), minuteExtra: match[2] ? Number(match[2]) : undefined };
}

function typeFromEntry(entry: WcCommentaryEntry): MatchEventType | null {
  const tag = (entry.type ?? "").toLowerCase();
  if (tag === "goal" || tag === "penalty_scored") return "goal";
  if (tag === "own_goal") return "own_goal";
  if (tag === "yellow_card") return "yellow_card";
  if (tag === "red_card") return "red_card";
  if (tag === "card") return "yellow_card";
  if (tag === "sub_in" || tag === "sub_out" || tag === "sub" || tag === "substitution") return "substitution";
  if (tag === "var") return "var_review";
  if (tag === "assist") return null;

  const text = entry.text.toLowerCase();
  if (text.includes("own goal")) return "own_goal";
  if (/\bgoal\b/.test(text) || text.includes("scores")) return "goal";
  if (text.includes("red card")) return "red_card";
  if (text.includes("yellow card")) return "yellow_card";
  if (text.includes("substitution") || text.includes(" replaces ")) return "substitution";
  if (text.includes("var")) return "var_review";
  return null;
}

function inferTeamId(
  text: string,
  homeTeamId: string,
  awayTeamId: string,
  homeName: string,
  awayName: string
): string {
  const lower = text.toLowerCase();
  if (homeName && lower.includes(homeName.toLowerCase())) return homeTeamId;
  if (awayName && lower.includes(awayName.toLowerCase())) return awayTeamId;
  return homeTeamId;
}

const PLAYER_NAME = "([A-Z][a-z]+(?:\\s+[A-Z][a-z'-]+)*)";
const SKIP_PLAYER_NAMES = /^(Goal|Yellow|Red|Card|Substitution|VAR|Penalty|Missed|Saved)$/i;

function firstCapitalizedName(text: string): string | undefined {
  const matches = text.matchAll(new RegExp(`\\b${PLAYER_NAME}\\b`, "g"));
  for (const match of matches) {
    const name = match[1]?.trim();
    if (name && !SKIP_PLAYER_NAMES.test(name)) return name;
  }
  return undefined;
}

function extractPlayer(text: string, type: MatchEventType): { playerName: string; assistName?: string } {
  if (type === "substitution") {
    const subMatch = text.match(/(.+?)\s+(?:replaces|on for|comes on for)\s+(.+?)(?:\.|$)/i);
    if (subMatch) return { playerName: subMatch[1].trim(), assistName: subMatch[2].trim() };
  }

  let playerName: string | undefined;

  if (type === "yellow_card" || type === "red_card" || type === "yellow_red_card") {
    const cardMatch = text.match(new RegExp(`(?:yellow|red)\\s+card\\s+(?:for\\s+)?${PLAYER_NAME}`, "i"));
    playerName = cardMatch?.[1];
  } else if (type === "goal" || type === "own_goal") {
    const scoresMatch = text.match(new RegExp(`${PLAYER_NAME}\\s+scores`, "i"));
    const goalMatch = text.match(
      new RegExp(`(?:goal(?:!)?\\s*(?:for\\s+[^!]+!?\\s*)?[-–:]?\\s*)${PLAYER_NAME}`, "i")
    );
    playerName = scoresMatch?.[1] ?? goalMatch?.[1];
  }

  const assistMatch = text.match(new RegExp(`assist(?:ed by|:)?\\s+${PLAYER_NAME}`, "i"));
  return {
    playerName: playerName ?? firstCapitalizedName(text) ?? "Unknown",
    assistName: assistMatch?.[1],
  };
}

/** Fallback: derive structured events from WC Live commentary text. */
export function mapCommentaryToEvents(
  entries: WcCommentaryEntry[],
  homeTeamId: string,
  awayTeamId: string,
  homeName: string,
  awayName: string
): MatchEvent[] {
  const events: MatchEvent[] = [];

  entries.forEach((entry, index) => {
    const type = typeFromEntry(entry);
    if (!type) return;

    const { minute, minuteExtra } = parseMinute(entry.minute);
    const playerName = entry.player ?? extractPlayer(entry.text, type).playerName;
    const { assistName } = extractPlayer(entry.text, type);

    let teamId = inferTeamId(entry.text, homeTeamId, awayTeamId, homeName, awayName);
    if (entry.side === "home") teamId = homeTeamId;
    if (entry.side === "away") teamId = awayTeamId;

    events.push({
      providerId: `wc-commentary-${index}-${minute}-${type}`,
      minute,
      minuteExtra,
      type,
      teamId,
      playerName,
      assistName,
    });
  });

  return events.sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));
}
