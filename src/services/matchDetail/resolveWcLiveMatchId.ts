import { getAllScheduleEntries } from "../BroadcastLookup";
import type { MergedMatch, Team } from "../../types";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { getCachedDrawFixtures } from "../../lib/wcLiveDrawCache";
import { fetchDraw, type WcDrawFixture } from "../WorldCup2026LiveClient";

const API_MATCH_ID = /^[A-Za-z0-9]{6,16}$/;

function normalizeTeamLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamLabel(a);
  const nb = normalizeTeamLabel(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function kickoffMs(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : undefined;
}

function isOfficialScheduleId(id: string): boolean {
  return /^M\d+$/i.test(id);
}

function isApiMatchId(id: string): boolean {
  return API_MATCH_ID.test(id) && !isOfficialScheduleId(id);
}

function fixtureMatchesTeams(
  fixture: WcDrawFixture,
  homeLabel: string,
  awayLabel: string
): boolean {
  return teamsMatch(fixture.home, homeLabel) && teamsMatch(fixture.away, awayLabel);
}

function findInDraw(
  fixtures: WcDrawFixture[],
  homeLabel: string,
  awayLabel: string,
  targetKickoffMs?: number
): WcDrawFixture | undefined {
  const candidates = fixtures.filter(
    (f) => f.matchId && fixtureMatchesTeams(f, homeLabel, awayLabel)
  );
  if (candidates.length === 0) return undefined;
  if (targetKickoffMs == null) return candidates[0];

  return candidates
    .slice()
    .sort((a, b) => {
      const da = Math.abs((kickoffMs(a.kickoff) ?? 0) - targetKickoffMs);
      const db = Math.abs((kickoffMs(b.kickoff) ?? 0) - targetKickoffMs);
      return da - db;
    })
    .find((f) => {
      const km = kickoffMs(f.kickoff);
      return km == null || Math.abs(km - targetKickoffMs) <= 3 * 60 * 60 * 1000;
    });
}

async function ensureDrawFixtures(): Promise<WcDrawFixture[]> {
  let fixtures = getCachedDrawFixtures();
  if (fixtures.length > 0) return fixtures;
  fixtures = await fetchDraw("group");
  return fixtures;
}

/** Map schedule id (M89) or alphanumeric API id to WC Live `matchId`. */
export async function resolveWcLiveApiMatchId(
  match: MergedMatch,
  hintId: string | null,
  teams: Record<string, Team>
): Promise<string | null> {
  if (hintId && isApiMatchId(hintId)) return hintId;

  const fixtures = await ensureDrawFixtures();
  const homeLabel = teamDisplayNameFromId(match.homeTeamId, teams);
  const awayLabel = teamDisplayNameFromId(match.awayTeamId, teams);
  const targetKickoff = kickoffMs(match.date);

  const byTeams = findInDraw(fixtures, homeLabel, awayLabel, targetKickoff);
  if (byTeams?.matchId) return byTeams.matchId;

  const officialId = hintId ?? match.matchId ?? match.id;
  if (officialId && isOfficialScheduleId(officialId)) {
    const matchNumber = parseInt(officialId.replace(/^M/i, ""), 10);
    const entry = getAllScheduleEntries().find((e) => e.matchNumber === matchNumber);
    if (entry) {
      const bySchedule = findInDraw(
        fixtures,
        entry.homeTeam,
        entry.awayTeam,
        kickoffMs(entry.kickoff.utc)
      );
      if (bySchedule?.matchId) return bySchedule.matchId;
    }
  }

  return null;
}

export function isWcLiveApiMatchId(id: string): boolean {
  return isApiMatchId(id);
}
