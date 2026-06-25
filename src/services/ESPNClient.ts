import type { GroupLetter, Match, MatchPeriod, Team } from "../types";
import { logger } from "./Logger";

const SCOREBOARD_PATH =
  "/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";

function isPlaceholderTeamName(name: string): boolean {
  return /^(group [a-l]\b|.*\b2nd place\b|.*\bthird place\b)/i.test(name.trim())
    || /\b(round of \d+|quarterfinal|semifinal)\b.*\b(winner|loser)\b/i.test(name)
    || /^round of \d+ \d+ winner$/i.test(name.trim());
}

function isKnockoutStage(note?: string, eventName?: string): boolean {
  const text = `${note ?? ""} ${eventName ?? ""}`.toLowerCase();
  return /round of|quarterfinal|semi-?final|third place|championship|knockout/i.test(text);
}

function proxied(path: string): string {
  if (typeof window === "undefined") return `https://site.api.espn.com${path}`;
  return `/espn${path}`;
}

function groupFromNote(note?: string): GroupLetter | undefined {
  const match = note?.match(/Group ([A-L])/);
  return match?.[1] as GroupLetter | undefined;
}

function parseConduct(details: unknown[]): Record<string, number> {
  const conduct: Record<string, number> = {};
  for (const detail of details) {
    const d = detail as { type?: { text?: string }; team?: { id?: string } };
    const text = String(d?.type?.text ?? "").toLowerCase();
    let delta = 0;
    if (text.includes("yellow") && text.includes("red")) delta = -5;
    else if (text.includes("red")) delta = -4;
    else if (text.includes("yellow")) delta = -1;
    if (delta && d.team?.id) {
      conduct[d.team.id] = (conduct[d.team.id] ?? 0) + delta;
    }
  }
  return conduct;
}

type EspnCompetitionStatus = {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: { state?: string; completed?: boolean; detail?: string };
};

export function parseEspnClockFields(status: EspnCompetitionStatus | undefined): {
  period?: MatchPeriod;
  clockMinute?: number;
  clockExtra?: number;
  clockRunning?: boolean;
  displayClock?: string;
} {
  if (!status) return {};

  const displayClock = status.displayClock?.trim();
  const state = status.type?.state;
  const detail = String(status.type?.detail ?? "").toLowerCase();
  const periodNum = status.period;

  let clockMinute: number | undefined;
  let clockExtra: number | undefined;

  if (displayClock) {
    const match = displayClock.match(/^(\d+)(?:[''])?(?:\+(\d+))?/);
    if (match) {
      clockMinute = Number(match[1]);
      if (match[2]) clockExtra = Number(match[2]);
    }
  } else if (typeof status.clock === "number" && Number.isFinite(status.clock)) {
    clockMinute = Math.max(0, Math.floor(status.clock / 60));
  }

  let period: MatchPeriod | undefined;
  if (state === "pre") {
    period = "not_started";
  } else if (state === "post" || status.type?.completed) {
    period = "full_time";
  } else if (detail.includes("penalt")) {
    period = "penalties";
  } else if (detail.includes("extra") && detail.includes("half")) {
    period = detail.includes("2") ? "extra_time_second" : "extra_time_first";
  } else if (detail.includes("half time") || detail === "halftime") {
    period = "half_time";
  } else if (periodNum === 1 || detail.includes("1st")) {
    period = "first_half";
  } else if (periodNum === 2 || detail.includes("2nd")) {
    period = "second_half";
  } else if (state === "in") {
    period = "second_half";
  }

  const clockRunning = state === "in";

  return {
    period,
    clockMinute,
    clockExtra,
    clockRunning,
    displayClock: displayClock ?? (clockMinute !== undefined ? `${clockMinute}'` : undefined)
  };
}

export function parseEspnScoreboard(scoreboard: unknown): { teams: Team[]; matches: Match[] } {
  const sb = scoreboard as { events?: unknown[] };
  const teams = new Map<string, Team>();
  const matches: Match[] = [];

  for (const event of sb?.events ?? []) {
    const e = event as {
      id: string;
      name?: string;
      date?: string;
      competitions?: Array<{
        date?: string;
        altGameNote?: string;
        venue?: { fullName?: string };
        competitors?: Array<{
          homeAway?: string;
          score?: string;
          team?: {
            id: string;
            displayName: string;
            shortDisplayName?: string;
            abbreviation: string;
            logo?: string;
            color?: string;
            alternateColor?: string;
          };
        }>;
        status?: {
          clock?: number;
          displayClock?: string;
          period?: number;
          type?: { state?: string; completed?: boolean; detail?: string };
        };
        details?: unknown[];
      }>;
    };

    const competition = e.competitions?.[0];
    if (!competition) continue;

    const group = groupFromNote(competition.altGameNote);
    const isKnockout = !group && isKnockoutStage(competition.altGameNote, e.name);

    const competitors = competition.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    if (!home?.team || !away?.team) continue;

    for (const competitor of [home, away]) {
      const t = competitor.team!;
      if (isPlaceholderTeamName(t.displayName)) continue;

      const existing = teams.get(t.id);
      if (!existing) {
        teams.set(t.id, {
          id: t.id,
          name: t.displayName,
          shortName: t.shortDisplayName ?? t.displayName,
          abbreviation: t.abbreviation,
          group: (group ?? "A") as Team["group"],
          logo: t.logo,
          color: t.color,
          alternateColor: t.alternateColor,
          rating: 1375
        });
      } else if (group && existing.group !== group) {
        teams.set(t.id, { ...existing, group });
      }
    }

    const statusType = competition.status?.type;
    const state = statusType?.state;
    const status = statusType?.completed ? "completed" : state === "in" ? "live" : "scheduled";
    const hasRealScore = status === "completed" || status === "live";
    const conduct = parseConduct(competition.details ?? []);
    const clockFields = parseEspnClockFields(competition.status);

    const match: Match = {
      id: String(e.id),
      date: competition.date ?? e.date ?? "",
      venue: competition.venue?.fullName,
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      status,
      homeScore: hasRealScore ? Number(home.score) : undefined,
      awayScore: hasRealScore ? Number(away.score) : undefined,
      homeConduct: conduct[home.team.id] ?? 0,
      awayConduct: conduct[away.team.id] ?? 0,
      locked: hasRealScore,
      source: "espn",
      ...clockFields
    };

    if (group) {
      match.group = group;
    }

    matches.push(match);
  }

  return {
    teams: [...teams.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)),
    matches: matches.sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
  };
}

export async function fetchScoreboard(): Promise<{ teams: Team[]; matches: Match[] }> {
  const url = proxied(SCOREBOARD_PATH);
  const direct = `https://site.api.espn.com${SCOREBOARD_PATH}`;
  for (const target of [url, direct]) {
    try {
      const res = await fetch(target);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return parseEspnScoreboard(data);
    } catch (error) {
      logger.warn("ESPN fetch attempt failed", "ESPNClient", {
        target,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  throw new Error("ESPN scoreboard unavailable");
}

export async function fetchMatchPlayByPlay(espnEventId: string): Promise<unknown> {
  const path = `/apis/site/v2/sports/soccer/fifa.world/playbyplay?event=${espnEventId}`;
  const url = typeof window !== "undefined" ? `/espn-web${path}` : `https://site.web.api.espn.com${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
