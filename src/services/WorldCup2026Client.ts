import type { Team } from "../types";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import { logger } from "./Logger";

const RAPIDAPI_HOST =
  providerByHost("world-cup-2026.p.rapidapi.com")?.host ?? "world-cup-2026.p.rapidapi.com";

let worldCup2026SessionDisabled = false;

export function isWorldCup2026Disabled(): boolean {
  return worldCup2026SessionDisabled;
}

export type Wc2026Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  slug?: string;
};

function baseUrl(): string {
  if (typeof window === "undefined") {
    return `https://${RAPIDAPI_HOST}`;
  }
  if (import.meta.env.DEV) {
    return "/rapidapi-wc2026";
  }
  return "/api/wc2026";
}

function rapidHeaders(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function handleBlocked(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403 && res.status !== 429) {
    return false;
  }
  worldCup2026SessionDisabled = true;
  const bodySnippet = await res.text().then((t) => t.slice(0, 300)).catch(() => "");
  logger.warn("WorldCup2026 blocked for session", "WorldCup2026Client", {
    status: res.status,
    bodySnippet,
  });
  return true;
}

export async function fetchTeams(): Promise<Wc2026Team[]> {
  if (worldCup2026SessionDisabled) return [];

  try {
    const res = await fetch(`${baseUrl()}/world-cup-2026/teams`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return [];
    if (!res.ok) throw new Error(`${res.status}`);

    const data = (await res.json()) as { teams?: Wc2026Team[] };
    return data.teams ?? [];
  } catch (error) {
    logger.warn("WorldCup2026 teams fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Alias for fetchTeams — returns all WC 2026 teams. */
export async function fetchAllTeams(): Promise<Wc2026Team[]> {
  return fetchTeams();
}

/** Fetches a single team by id. */
export async function fetchTeam(teamId: string): Promise<Wc2026Team | null> {
  if (worldCup2026SessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}/world-cup-2026/teams/${encodeURIComponent(teamId)}`, {
      headers: rapidHeaders(),
    });
    if (await handleBlocked(res)) return null;
    if (!res.ok) return null;
    return (await res.json()) as Wc2026Team;
  } catch (error) {
    logger.warn("WorldCup2026 team fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
      teamId,
    });
    return null;
  }
}

/** Fetches group assignments (raw). */
export async function fetchGroups(): Promise<unknown> {
  if (worldCup2026SessionDisabled) return null;

  try {
    const res = await fetch(`${baseUrl()}/world-cup-2026/groups`, { headers: rapidHeaders() });
    if (await handleBlocked(res)) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    logger.warn("WorldCup2026 groups fetch failed", "WorldCup2026Client", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function mergeTeamMetadata(
  teams: Record<string, Team>,
  wcTeams: Wc2026Team[]
): { teams: Record<string, Team>; patched: number } {
  const byAbbrev = new Map(wcTeams.map((t) => [t.abbreviation.toUpperCase(), t]));
  const result: Record<string, Team> = { ...teams };
  let patched = 0;

  for (const [id, team] of Object.entries(teams)) {
    const wc = byAbbrev.get(team.abbreviation.toUpperCase());
    if (!wc) continue;

    const updates: Partial<Team> = {};
    if (wc.logo) updates.logo = wc.logo;
    if (wc.color) updates.color = wc.color;

    if (Object.keys(updates).length === 0) continue;

    result[id] = { ...team, ...updates };
    patched += 1;
  }

  return { teams: result, patched };
}

/** Test-only reset */
export function resetWorldCup2026SessionForTests(): void {
  worldCup2026SessionDisabled = false;
}
