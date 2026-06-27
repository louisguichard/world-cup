import type { MatchEvent, MatchEventType } from "../../types";

type EspnParticipant = {
  athlete?: { displayName?: string; shortName?: string };
  type?: string;
};

type EspnAthleteInvolved = {
  id?: string;
  displayName?: string;
  shortName?: string;
  fullName?: string;
  team?: { id?: string };
};

type EspnDetail = {
  type?: { text?: string; id?: string };
  clock?: { displayValue?: string; value?: number };
  team?: { id?: string };
  participants?: EspnParticipant[];
  athletesInvolved?: EspnAthleteInvolved[];
  athlete?: { displayName?: string };
  ownGoal?: boolean;
  redCard?: boolean;
  yellowCard?: boolean;
  text?: string;
};

function parseClock(displayValue?: string, value?: number): { minute: number; minuteExtra?: number } {
  if (displayValue) {
    const match = displayValue.match(/(\d+)(?:[''])?(?:\+(\d+))?/);
    if (match) {
      return {
        minute: Number(match[1]),
        minuteExtra: match[2] ? Number(match[2]) : undefined,
      };
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { minute: Math.max(0, Math.floor(value / 60)) };
  }
  return { minute: 0 };
}

function eventTypeFromDetail(text: string, detail: EspnDetail): MatchEventType | null {
  const t = text.toLowerCase();
  if (detail.ownGoal || t.includes("own goal")) return "own_goal";
  if (t.includes("goal") || t.includes("scores")) return "goal";
  if (detail.redCard && detail.yellowCard) return "yellow_red_card";
  if (t.includes("yellow") && t.includes("red")) return "yellow_red_card";
  if (detail.redCard || t.includes("red card") || (t.includes("red") && t.includes("card"))) {
    return "red_card";
  }
  if (detail.yellowCard || t.includes("yellow")) return "yellow_card";
  if (t.includes("substitution") || t.includes("subbed") || t.includes(" replaces ")) return "substitution";
  if (t.includes("var")) return "var_review";
  if (t.includes("penalty missed")) return "penalty_missed";
  if (t.includes("penalty saved")) return "penalty_saved";
  if (t.includes("disallowed")) return "goal_disallowed";
  return null;
}

function participantName(parts: EspnParticipant[] | undefined, role: string): string | undefined {
  const hit = parts?.find((p) => p.type?.toLowerCase() === role.toLowerCase());
  return hit?.athlete?.displayName ?? hit?.athlete?.shortName;
}

function athleteInvolvedName(athletes: EspnAthleteInvolved[] | undefined, index = 0): string | undefined {
  const athlete = athletes?.[index];
  if (!athlete) return undefined;
  return athlete.displayName ?? athlete.fullName ?? athlete.shortName;
}

function resolvePlayerName(detail: EspnDetail): string {
  return (
    participantName(detail.participants, "scorer") ??
    participantName(detail.participants, "player") ??
    athleteInvolvedName(detail.athletesInvolved, 0) ??
    detail.athlete?.displayName ??
    detail.participants?.[0]?.athlete?.displayName ??
    "Unknown"
  );
}

function resolveAssistName(detail: EspnDetail, type: MatchEventType): string | undefined {
  if (type === "substitution") {
    return (
      participantName(detail.participants, "playerOut") ??
      participantName(detail.participants, "replaced") ??
      athleteInvolvedName(detail.athletesInvolved, 1)
    );
  }
  return (
    participantName(detail.participants, "assist") ?? athleteInvolvedName(detail.athletesInvolved, 1)
  );
}

function resolveTeamId(
  detail: EspnDetail,
  homeTeamId: string,
  awayTeamId: string
): string {
  const espnTeamId = detail.team?.id;
  if (espnTeamId === homeTeamId) return homeTeamId;
  if (espnTeamId === awayTeamId) return awayTeamId;
  const involvedTeamId = detail.athletesInvolved?.[0]?.team?.id;
  if (involvedTeamId === homeTeamId) return homeTeamId;
  if (involvedTeamId === awayTeamId) return awayTeamId;
  return homeTeamId;
}

function detailToEvent(
  detail: EspnDetail,
  espnEventId: string,
  homeTeamId: string,
  awayTeamId: string,
  index: number
): MatchEvent | null {
  const text = String(detail.type?.text ?? detail.text ?? "");
  const type = eventTypeFromDetail(text, detail);
  if (!type) return null;

  const { minute, minuteExtra } = parseClock(detail.clock?.displayValue, detail.clock?.value);
  const teamId = resolveTeamId(detail, homeTeamId, awayTeamId);
  const playerName = resolvePlayerName(detail);
  const assistName = resolveAssistName(detail, type);
  const athleteId = detail.athletesInvolved?.[0]?.id;

  return {
    providerId: `espn-${espnEventId}-${index}-${type}-${minute}`,
    espnEventId,
    minute,
    minuteExtra,
    type,
    teamId,
    playerName,
    playerId: athleteId != null ? String(athleteId) : undefined,
    assistName,
  };
}

/** Parses ESPN scoreboard `competition.details` into match events. */
export function mapEspnDetailsToEvents(
  details: unknown[],
  espnEventId: string,
  homeTeamId: string,
  awayTeamId: string
): MatchEvent[] {
  const events: MatchEvent[] = [];
  details.forEach((detail, index) => {
    const event = detailToEvent(detail as EspnDetail, espnEventId, homeTeamId, awayTeamId, index);
    if (event) events.push(event);
  });
  return events.sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));
}

/** Parses ESPN play-by-play payload into match events. */
export function mapEspnPlayByPlayToEvents(
  payload: unknown,
  espnEventId: string,
  homeTeamId: string,
  awayTeamId: string
): MatchEvent[] {
  const root = payload as { plays?: unknown[]; drives?: { plays?: unknown[] }[] };
  const plays = root.plays ?? root.drives?.flatMap((d) => d.plays ?? []) ?? [];
  const events: MatchEvent[] = [];

  plays.forEach((play, index) => {
    const event = detailToEvent(play as EspnDetail, espnEventId, homeTeamId, awayTeamId, index);
    if (event) events.push(event);
  });

  return events.sort((a, b) => a.minute - b.minute || (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0));
}
