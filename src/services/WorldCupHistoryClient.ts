import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { isApiEnabled } from "../config/apiFlags";
import {
  WORLD_CUP_HISTORY_HOST,
  worldCupHistoryEndpoints,
} from "../config/worldCupHistoryEndpoints";
import type {
  WorldCupAwardEntry,
  WorldCupTournamentDetail,
  WorldCupWinnerEntry,
} from "../types/worldCupHistory";
import { logger } from "./Logger";

let sessionDisabled = false;

export function isWorldCupHistoryDisabled(): boolean {
  return sessionDisabled;
}

export function resetWorldCupHistorySessionForTests(): void {
  sessionDisabled = false;
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${WORLD_CUP_HISTORY_HOST}`;
  }
  return "/api/world-cup-history";
}

function headers(): HeadersInit {
  return rapidApiHeaders(providerByHost(WORLD_CUP_HISTORY_HOST)?.host ?? WORLD_CUP_HISTORY_HOST);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function pickField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  return str(pickField(obj, keys));
}

function pickYear(obj: Record<string, unknown>): number | undefined {
  return num(pickField(obj, ["year", "Year", "YEAR", "edition", "Edition", "world_cup_year"]));
}

function pickPlayer(obj: Record<string, unknown>): string | undefined {
  return pickString(obj, [
    "player",
    "Player",
    "name",
    "Name",
    "winner",
    "Winner",
    "golden_ball",
    "golden_boot",
    "golden_glove",
    "best_young_player",
  ]);
}

function pickCountry(obj: Record<string, unknown>): string | undefined {
  return pickString(obj, [
    "country",
    "Country",
    "nationality",
    "Nationality",
    "team",
    "Team",
    "nation",
    "Nation",
  ]);
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];

  for (const key of [
    "data",
    "results",
    "winners",
    "world_cups",
    "world_cups_details",
    "golden_ball",
    "golden_boot",
    "golden_glove",
    "best_young_player",
    "items",
  ]) {
    const value = raw[key];
    if (Array.isArray(value)) return value;
  }

  return Object.values(raw).filter(isRecord);
}

export function normalizeWinnerEntry(raw: unknown): WorldCupWinnerEntry | null {
  if (!isRecord(raw)) return null;
  const year = pickYear(raw);
  const winner =
    pickString(raw, ["winner", "Winner", "country", "Country", "champion", "Champion", "team", "Team"]) ??
    pickPlayer(raw);
  if (!year || !winner) return null;

  return {
    year,
    winner,
    runnerUp: pickString(raw, ["runner_up", "runnerUp", "Runner-up", "Runner_up", "second", "Second"]),
    host: pickString(raw, ["host", "Host", "hosts", "Hosts", "host_country", "hostCountry"]),
    finalScore: pickString(raw, ["score", "Score", "final_score", "finalScore", "result", "Result"]),
    thirdPlace: pickString(raw, ["third", "Third", "third_place", "thirdPlace"]),
  };
}

export function normalizeWinners(raw: unknown): WorldCupWinnerEntry[] {
  return unwrapList(raw)
    .map(normalizeWinnerEntry)
    .filter((entry): entry is WorldCupWinnerEntry => entry !== null)
    .sort((a, b) => b.year - a.year);
}

export function normalizeAwardEntry(raw: unknown): WorldCupAwardEntry | null {
  if (!isRecord(raw)) return null;
  const year = pickYear(raw);
  const player = pickPlayer(raw);
  const country = pickCountry(raw) ?? pickString(raw, ["winner_country", "winnerCountry"]);
  if (!year || !player) return null;

  return {
    year,
    player,
    country: country ?? "",
    goals: num(pickField(raw, ["goals", "Goals", "score", "Score", "g"])),
    note: pickString(raw, ["note", "Note", "club", "Club"]),
  };
}

export function normalizeAwardList(raw: unknown): WorldCupAwardEntry[] {
  return unwrapList(raw)
    .map(normalizeAwardEntry)
    .filter((entry): entry is WorldCupAwardEntry => entry !== null)
    .sort((a, b) => b.year - a.year);
}

function mergeAwardIntoDetail(
  detail: WorldCupTournamentDetail,
  award: WorldCupAwardEntry,
  kind: "goldenBall" | "goldenBoot" | "goldenGlove" | "bestYoungPlayer" | "topScorer"
): WorldCupTournamentDetail {
  return { ...detail, [kind]: award };
}

export function normalizeTournamentDetail(raw: unknown): WorldCupTournamentDetail | null {
  if (!isRecord(raw)) return null;
  const year = pickYear(raw);
  const winner =
    pickString(raw, ["winner", "Winner", "champion", "Champion", "country", "Country"]) ?? pickPlayer(raw);
  if (!year || !winner) return null;

  let detail: WorldCupTournamentDetail = {
    year,
    host: pickString(raw, ["host", "Host", "hosts", "Hosts", "host_country", "hostCountry"]),
    winner,
    runnerUp: pickString(raw, ["runner_up", "runnerUp", "Runner-up", "second", "Second"]),
    thirdPlace: pickString(raw, ["third", "Third", "third_place", "thirdPlace"]),
    teamsCount: num(pickField(raw, ["teams", "Teams", "teams_count", "teamsCount"])),
    attendance: num(pickField(raw, ["attendance", "Attendance"])),
    raw,
  };

  const ball = normalizeAwardEntry(
    isRecord(pickField(raw, ["golden_ball", "goldenBall", "Golden Ball"]))
      ? (pickField(raw, ["golden_ball", "goldenBall", "Golden Ball"]) as Record<string, unknown>)
      : { year, player: pickString(raw, ["golden_ball", "goldenBall"]), country: pickCountry(raw) }
  );
  if (ball) detail = mergeAwardIntoDetail(detail, ball, "goldenBall");

  const boot = normalizeAwardEntry(
    isRecord(pickField(raw, ["golden_boot", "goldenBoot", "Golden Boot"]))
      ? (pickField(raw, ["golden_boot", "goldenBoot", "Golden Boot"]) as Record<string, unknown>)
      : {
          year,
          player: pickString(raw, ["golden_boot", "goldenBoot", "top_scorer", "topScorer"]),
          country: pickCountry(raw),
          goals: num(pickField(raw, ["goals", "Goals"])),
        }
  );
  if (boot) detail = mergeAwardIntoDetail(detail, boot, "goldenBoot");

  const glove = normalizeAwardEntry(
    isRecord(pickField(raw, ["golden_glove", "goldenGlove", "Golden Glove"]))
      ? (pickField(raw, ["golden_glove", "goldenGlove", "Golden Glove"]) as Record<string, unknown>)
      : { year, player: pickString(raw, ["golden_glove", "goldenGlove"]), country: pickCountry(raw) }
  );
  if (glove) detail = mergeAwardIntoDetail(detail, glove, "goldenGlove");

  const young = normalizeAwardEntry(
    isRecord(pickField(raw, ["best_young_player", "bestYoungPlayer", "Best Young Player"]))
      ? (pickField(raw, ["best_young_player", "bestYoungPlayer", "Best Young Player"]) as Record<
          string,
          unknown
        >)
      : { year, player: pickString(raw, ["best_young_player", "bestYoungPlayer"]), country: pickCountry(raw) }
  );
  if (young) detail = mergeAwardIntoDetail(detail, young, "bestYoungPlayer");

  return detail;
}

export function normalizeTournamentDetails(raw: unknown): WorldCupTournamentDetail[] {
  return unwrapList(raw)
    .map(normalizeTournamentDetail)
    .filter((entry): entry is WorldCupTournamentDetail => entry !== null)
    .sort((a, b) => b.year - a.year);
}

async function fetchJson(path: string, context: string): Promise<unknown | null> {
  if (sessionDisabled || !isApiEnabled("worldCupHistory")) return null;

  const attempt = async (p: string): Promise<Response | null> => {
    try {
      return await fetch(`${baseUrl()}${p}`, { headers: headers() });
    } catch (error) {
      logger.warn(`WorldCupHistory ${context} error`, "WorldCupHistoryClient", {
        path: p,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  };

  let res = await attempt(path);
  if (!res) return null;

  if (res.status === 404 && !path.endsWith("/")) {
    res = (await attempt(`${path}/`)) ?? res;
  }

  if (res.status === 401 || res.status === 403 || res.status === 429) {
    if (res.status === 429) sessionDisabled = true;
    logger.warn(`WorldCupHistory ${context} blocked`, "WorldCupHistoryClient", { status: res.status, path });
    return null;
  }

  if (res.status === 404) return null;

  if (!res.ok) {
    logger.warn(`WorldCupHistory ${context} failed`, "WorldCupHistoryClient", {
      status: res.status,
      path,
    });
    return null;
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchWinners(): Promise<WorldCupWinnerEntry[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.winners(), "winners");
  return data ? normalizeWinners(data) : [];
}

export async function fetchWinnersByYear(year: number): Promise<WorldCupWinnerEntry | null> {
  const data = await fetchJson(worldCupHistoryEndpoints.winnersByYear(year), "winners-by-year");
  if (!data) return null;
  const list = normalizeWinners(data);
  return list[0] ?? normalizeWinnerEntry(data);
}

export async function fetchWorldCupsDetails(): Promise<WorldCupTournamentDetail[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.worldCupsDetails(), "world-cups-details");
  return data ? normalizeTournamentDetails(data) : [];
}

export async function fetchWorldCupDetailByYear(year: number): Promise<WorldCupTournamentDetail | null> {
  const data = await fetchJson(worldCupHistoryEndpoints.worldCupDetailByYear(year), "world-cup-detail-by-year");
  if (!data) return null;
  const list = normalizeTournamentDetails(data);
  return list[0] ?? normalizeTournamentDetail(data);
}

export async function fetchGoldenBall(): Promise<WorldCupAwardEntry[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.goldenBall(), "golden-ball");
  return data ? normalizeAwardList(data) : [];
}

export async function fetchGoldenBoot(): Promise<WorldCupAwardEntry[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.goldenBoot(), "golden-boot");
  return data ? normalizeAwardList(data) : [];
}

export async function fetchBestYoungPlayer(): Promise<WorldCupAwardEntry[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.bestYoungPlayer(), "best-young-player");
  return data ? normalizeAwardList(data) : [];
}

export async function fetchGoldenGlove(): Promise<WorldCupAwardEntry[]> {
  const data = await fetchJson(worldCupHistoryEndpoints.goldenGlove(), "golden-glove");
  return data ? normalizeAwardList(data) : [];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
