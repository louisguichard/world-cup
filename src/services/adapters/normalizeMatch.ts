import type { MergedMatch } from "../../types";
import { mapExternalStatus, parseClockMinute, parseScoreValue, toUtcIso } from "./normalizeStatus";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** Converts WC Live API match payload into partial MergedMatch fields. */
export function normalizeWCLiveMatch(raw: unknown): Partial<MergedMatch> {
  if (!isRecord(raw)) return {};

  const partial: Partial<MergedMatch> = {};
  const id = raw.id ?? raw.matchId;
  if (id != null) partial.id = String(id);
  if (raw.matchId != null) partial.matchId = String(raw.matchId);

  const homeScore = parseScoreValue(raw.homeScore);
  const awayScore = parseScoreValue(raw.awayScore);
  if (homeScore !== undefined) partial.homeScore = homeScore;
  if (awayScore !== undefined) partial.awayScore = awayScore;

  const status = mapExternalStatus(raw.status);
  if (status) partial.status = status;

  const minute = parseClockMinute(raw.minute);
  if (minute !== undefined) {
    partial.clockMinute = minute;
    partial.displayClock = `${minute}'`;
  }

  if (str(raw.homeTeam)) partial.homeTeamId = str(raw.homeTeam)!;
  if (str(raw.awayTeam)) partial.awayTeamId = str(raw.awayTeam)!;

  return partial;
}

/** Converts Zafronix live match payload into partial MergedMatch fields. */
export function normalizeZafronixMatch(raw: unknown): Partial<MergedMatch> {
  if (!isRecord(raw)) return {};

  const partial: Partial<MergedMatch> = {};
  if (raw.id != null) partial.id = String(raw.id);

  const homeScore = parseScoreValue(raw.homeScore);
  const awayScore = parseScoreValue(raw.awayScore);
  if (homeScore !== undefined) partial.homeScore = homeScore;
  if (awayScore !== undefined) partial.awayScore = awayScore;

  const status = mapExternalStatus(raw.status);
  if (status) partial.status = status;

  const date = toUtcIso(raw.date ?? raw.kickoff);
  if (date) partial.date = date;

  if (str(raw.homeTeam)) partial.homeTeamId = str(raw.homeTeam)!;
  if (str(raw.awayTeam)) partial.awayTeamId = str(raw.awayTeam)!;

  return partial;
}

/** Converts SportAPI7 event payload into partial MergedMatch fields. */
export function normalizeSportAPI7Match(raw: unknown): Partial<MergedMatch> {
  if (!isRecord(raw)) return {};

  const partial: Partial<MergedMatch> = {};
  if (raw.id != null) partial.id = String(raw.id);

  const home = isRecord(raw.homeTeam) ? raw.homeTeam : undefined;
  const away = isRecord(raw.awayTeam) ? raw.awayTeam : undefined;
  if (home?.name) partial.homeTeamId = String(home.name);
  if (away?.name) partial.awayTeamId = String(away.name);

  const homeScore = isRecord(raw.homeScore)
    ? parseScoreValue(raw.homeScore.current)
    : parseScoreValue(raw.homeScore);
  const awayScore = isRecord(raw.awayScore)
    ? parseScoreValue(raw.awayScore.current)
    : parseScoreValue(raw.awayScore);
  if (homeScore !== undefined) partial.homeScore = homeScore;
  if (awayScore !== undefined) partial.awayScore = awayScore;

  const statusObj = isRecord(raw.status) ? raw.status : undefined;
  const status = mapExternalStatus(statusObj?.type ?? raw.status);
  if (status) partial.status = status;

  if (typeof raw.startTimestamp === "number") {
    partial.date = new Date(raw.startTimestamp * 1000).toISOString();
  }

  if (statusObj?.description && typeof statusObj.description === "string") {
    partial.displayClock = statusObj.description;
  }

  return partial;
}

/** Converts Free API (FotMob) match payload into partial MergedMatch fields. */
export function normalizeFreeAPIMatch(raw: unknown): Partial<MergedMatch> {
  if (!isRecord(raw)) return {};

  const partial: Partial<MergedMatch> = {};
  if (raw.id != null) partial.id = String(raw.id);

  const home = isRecord(raw.home) ? raw.home : undefined;
  const away = isRecord(raw.away) ? raw.away : undefined;
  if (home?.name) partial.homeTeamId = String(home.name);
  if (away?.name) partial.awayTeamId = String(away.name);

  const homeScore = parseScoreValue(home?.score);
  const awayScore = parseScoreValue(away?.score);
  if (homeScore !== undefined) partial.homeScore = homeScore;
  if (awayScore !== undefined) partial.awayScore = awayScore;

  const statusBlock = isRecord(raw.status) ? raw.status : undefined;
  if (statusBlock?.ongoing === true) partial.status = "live";
  else if (statusBlock?.finished === true) partial.status = "completed";
  else partial.status = "scheduled";

  const date = toUtcIso(statusBlock?.utcTime ?? raw.timeTS);
  if (date) partial.date = date;

  return partial;
}
