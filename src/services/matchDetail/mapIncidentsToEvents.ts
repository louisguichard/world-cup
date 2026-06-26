import type { MatchEvent, MatchEventType } from "../../types";

// Raw incident shapes from SportAPI7 / WC Live commentary
export type RawIncident = {
  id?: string | number;
  minute?: number | string;
  minuteExtra?: number | string;
  type?: string;
  incidentType?: string;
  team?: "home" | "away" | string;
  homeTeam?: boolean;
  playerName?: string;
  player?: { name?: string; id?: string | number };
  assistPlayerName?: string;
  assistPlayer?: { name?: string; id?: string | number };
  isConfirmed?: boolean;
  varOutcome?: string;
};

const INCIDENT_TYPE_MAP: Record<string, MatchEventType> = {
  goal: "goal",
  Goal: "goal",
  GOAL: "goal",
  own_goal: "own_goal",
  ownGoal: "own_goal",
  OWN_GOAL: "own_goal",
  yellow_card: "yellow_card",
  yellowCard: "yellow_card",
  YELLOW_CARD: "yellow_card",
  red_card: "red_card",
  redCard: "red_card",
  RED_CARD: "red_card",
  yellow_red: "yellow_red_card",
  yellowRed: "yellow_red_card",
  YELLOW_RED: "yellow_red_card",
  substitution: "substitution",
  Substitution: "substitution",
  SUBSTITUTION: "substitution",
  var: "var_review",
  VAR: "var_review",
  var_review: "var_review",
  varReview: "var_review",
  goal_disallowed: "goal_disallowed",
  goalDisallowed: "goal_disallowed",
  penalty_missed: "penalty_missed",
  penaltyMissed: "penalty_missed",
  penalty_saved: "penalty_saved",
  penaltySaved: "penalty_saved"
};

function resolveEventType(raw: RawIncident): MatchEventType | null {
  const typeStr = raw.incidentType ?? raw.type ?? "";
  return INCIDENT_TYPE_MAP[typeStr] ?? null;
}

function resolveTeamId(raw: RawIncident, homeTeamId: string, awayTeamId: string): string {
  if (raw.team === "home" || raw.homeTeam === true) return homeTeamId;
  if (raw.team === "away" || raw.homeTeam === false) return awayTeamId;
  return homeTeamId;
}

function resolvePlayerName(raw: RawIncident): string {
  if (raw.playerName) return raw.playerName;
  if (raw.player?.name) return raw.player.name;
  return "Unknown";
}

export function mapIncidentsToEvents(
  incidents: RawIncident[],
  homeTeamId: string,
  awayTeamId: string
): MatchEvent[] {
  const events: MatchEvent[] = [];

  for (const inc of incidents) {
    const eventType = resolveEventType(inc);
    if (!eventType) continue;

    const minute = typeof inc.minute === "string" ? parseInt(inc.minute, 10) : (inc.minute ?? 0);
    const minuteExtra =
      inc.minuteExtra !== undefined
        ? typeof inc.minuteExtra === "string"
          ? parseInt(inc.minuteExtra, 10)
          : inc.minuteExtra
        : undefined;

    const event: MatchEvent = {
      providerId: String(inc.id ?? `${minute}-${eventType}`),
      minute,
      minuteExtra: isNaN(minuteExtra ?? NaN) ? undefined : minuteExtra,
      type: eventType,
      teamId: resolveTeamId(inc, homeTeamId, awayTeamId),
      playerName: resolvePlayerName(inc),
      assistName:
        inc.assistPlayerName ??
        inc.assistPlayer?.name ??
        undefined,
      isVarReviewed: inc.varOutcome !== undefined,
      varOutcome:
        inc.varOutcome === "confirmed" || inc.varOutcome === "overturned"
          ? inc.varOutcome
          : undefined
    };

    events.push(event);
  }

  // Sort chronologically
  return events.sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));
}
