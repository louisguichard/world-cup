import { buildOfficialGroupRoster } from "../../lib/officialGroupRoster";
import { resolveCanonicalTeamId, resolveCatalogTeamIdByName, resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import type { GroupLetter, GroupStanding, Team, TeamRecord } from "../../types";
import { groupLetters } from "../../types";
import type { WcStanding } from "../WorldCup2026LiveClient";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseGroup(raw: unknown): GroupLetter | undefined {
  if (typeof raw !== "string") return undefined;
  const g = raw.trim().toUpperCase().replace(/^GROUP\s*/i, "");
  if ((groupLetters as readonly string[]).includes(g)) return g as GroupLetter;
  return undefined;
}

function slugTeamId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Converts WC Live standings payload into GroupStanding array. */
export function normalizeWCLiveStandings(raw: unknown): GroupStanding[] {
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.standings) ? raw.standings : [];
  const result: GroupStanding[] = [];

  for (const entry of list) {
    const standing = entry as WcStanding;
    const group = parseGroup(standing.group);
    if (!group || !Array.isArray(standing.teams)) continue;

    const rows: TeamRecord[] = standing.teams.map((t) => ({
      teamId: resolveCatalogTeamIdByName(t.name) ?? slugTeamId(t.name),
      group,
      played: t.played ?? 0,
      wins: t.won ?? 0,
      draws: t.drawn ?? 0,
      losses: t.lost ?? 0,
      goalsFor: t.gf ?? 0,
      goalsAgainst: t.ga ?? 0,
      goalDifference: t.gd ?? 0,
      points: t.points ?? 0,
      conduct: 0,
      rating: 0,
    }));

    result.push({ group, rows });
  }

  return result;
}

/** Converts Zafronix /standings or /bracket payload into GroupStanding array (best-effort). */
export function normalizeZafronixStandings(raw: unknown): GroupStanding[] {
  if (isRecord(raw) && Array.isArray(raw.standings) && !raw.groups) {
    return normalizeZafronixBracket({ groups: raw.standings });
  }
  return normalizeZafronixBracket(raw);
}

/** Converts Zafronix bracket/groups payload into GroupStanding array (best-effort). */
export function normalizeZafronixBracket(raw: unknown): GroupStanding[] {
  if (!isRecord(raw)) return [];
  const groups = raw.groups ?? raw.groupStage;
  if (!Array.isArray(groups)) return [];

  const result: GroupStanding[] = [];
  for (const g of groups) {
    if (!isRecord(g)) continue;
    const group = parseGroup(g.group ?? g.name);
    if (!group) continue;

    const teams = g.teams ?? g.standings;
    if (!Array.isArray(teams)) continue;

    const rows: TeamRecord[] = teams.map((t, idx) => {
      const row = isRecord(t) ? t : {};
      const name = String(row.name ?? row.team ?? `team-${idx}`);
      return {
        teamId: resolveCatalogTeamIdByName(name) ?? slugTeamId(name),
        group,
        played: Number(row.played ?? row.p ?? 0),
        wins: Number(row.wins ?? row.w ?? row.won ?? 0),
        draws: Number(row.draws ?? row.d ?? row.drawn ?? 0),
        losses: Number(row.losses ?? row.l ?? row.lost ?? 0),
        goalsFor: Number(row.goalsFor ?? row.gf ?? 0),
        goalsAgainst: Number(row.goalsAgainst ?? row.ga ?? 0),
        goalDifference: Number(row.goalDifference ?? row.gd ?? 0),
        points: Number(row.points ?? row.pts ?? 0),
        conduct: 0,
        rating: 0,
      };
    });

    result.push({ group, rows });
  }

  return result;
}

/** Converts WC2026 groups API payload into GroupStanding array. */
export function normalizeWC2026Groups(raw: unknown): GroupStanding[] {
  if (!isRecord(raw)) return [];
  const groups = raw.groups;
  if (!Array.isArray(groups)) return [];

  const result: GroupStanding[] = [];
  for (const g of groups) {
    if (!isRecord(g)) continue;
    const group = parseGroup(g.group ?? g.letter);
    if (!group) continue;

    const teams = g.teams;
    if (!Array.isArray(teams)) continue;

    const rows: TeamRecord[] = teams.map((t, idx) => {
      const row = isRecord(t) ? t : {};
      const id = String(row.id ?? row.abbreviation ?? `team-${idx}`);
      return {
        teamId: id,
        group,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        conduct: 0,
        rating: 0,
      };
    });

    result.push({ group, rows });
  }

  return result;
}

/** Zero-point tables from team.group — used before any match results exist. */
export function buildStandingsFromTeamGroups(teams: Team[]): GroupStanding[] {
  const byGroup = new Map<GroupLetter, Team[]>();

  for (const team of teams) {
    if (!team.group) continue;
    const list = byGroup.get(team.group) ?? [];
    list.push(team);
    byGroup.set(team.group, list);
  }

  const result: GroupStanding[] = [];

  for (const group of groupLetters) {
    const groupTeams = byGroup.get(group);
    if (!groupTeams?.length) continue;

    const rows: TeamRecord[] = groupTeams
      .map((team) => ({
        teamId: resolveCanonicalTeamId(team.id, team),
        group,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        conduct: 0,
        rating: team.rating,
        fifaRank: team.fifaRank,
      }))
      .sort(
        (a, b) =>
          (a.fifaRank ?? 999) - (b.fifaRank ?? 999) ||
          b.rating - a.rating ||
          a.teamId.localeCompare(b.teamId)
      );

    result.push({ group, rows });
  }

  return result;
}

function rowStatScore(row: TeamRecord): number {
  return row.played * 1000 + row.points * 10 + Math.abs(row.goalDifference);
}

/** Higher = richer standings payload (used to reject API downgrades). */
export function standingsStatScore(standings: GroupStanding[]): number {
  return standings.reduce((sum, group) => sum + group.rows.reduce((s, row) => s + rowStatScore(row), 0), 0);
}

export function standingsHasLiveStats(standings: GroupStanding[]): boolean {
  return standings.some((group) => group.rows.some((row) => row.played > 0));
}

function sortStandingRows(rows: TeamRecord[]): TeamRecord[] {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      (a.fifaRank ?? 999) - (b.fifaRank ?? 999)
  );
}

/** Collapse ESPN / API ids onto catalog ids (bra, mex, …) for qualification bucketing. */
export function normalizeStandingsTeamIds(
  standings: GroupStanding[],
  teams: Record<string, Team>
): GroupStanding[] {
  return standings.map((standing) => {
    const teamMap = new Map<string, TeamRecord>();

    for (const row of standing.rows) {
      const canonicalId = resolveCanonicalTeamId(
        row.teamId,
        teams[row.teamId] ?? resolveTeamFromStore(teams, row.teamId)
      );
      const normalized = canonicalId === row.teamId ? row : { ...row, teamId: canonicalId };
      const existing = teamMap.get(canonicalId);
      if (!existing || rowStatScore(normalized) > rowStatScore(existing)) {
        teamMap.set(canonicalId, normalized);
      }
    }

    return {
      group: standing.group,
      rows: sortStandingRows([...teamMap.values()]),
    };
  });
}

/** One row per catalog team per group — drops duplicate upstream ids and stray extras. */
export function alignStandingsToCatalogGroups(
  standings: GroupStanding[],
  teams: Record<string, Team>
): GroupStanding[] {
  const rowsByGroup = new Map<GroupLetter, Map<string, TeamRecord>>(
    standings.map((standing) => [standing.group, new Map(standing.rows.map((row) => [row.teamId, row]))])
  );

  const result: GroupStanding[] = [];

  for (const group of groupLetters) {
    const catalogIds = buildOfficialGroupRoster()[group] ?? [];
    if (catalogIds.length === 0) continue;

    const rowMap = rowsByGroup.get(group) ?? new Map<string, TeamRecord>();
    const rows = catalogIds.map((teamId) => {
      const existing = rowMap.get(teamId);
      if (existing) return existing;
      const team = resolveTeamFromStore(teams, teamId);
      return {
        teamId,
        group,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        conduct: 0,
        rating: team?.rating ?? 0,
        fifaRank: team?.fifaRank,
      } satisfies TeamRecord;
    });

    result.push({ group, rows: sortStandingRows(rows) });
  }

  return result;
}

export function finalizeGroupStandings(
  standings: GroupStanding[],
  teams: Record<string, Team>
): GroupStanding[] {
  return alignStandingsToCatalogGroups(normalizeStandingsTeamIds(standings, teams), teams);
}

/** Merges standings from multiple sources — higher-played rows win per group/team. */
export function mergeStandingsPartials(...sources: GroupStanding[][]): GroupStanding[] {
  const byGroup = new Map<GroupLetter, Map<string, TeamRecord>>();

  for (const standings of sources) {
    for (const g of standings) {
      if (!byGroup.has(g.group)) byGroup.set(g.group, new Map());
      const teamMap = byGroup.get(g.group)!;

      for (const row of g.rows) {
        const existing = teamMap.get(row.teamId);
        if (!existing || rowStatScore(row) > rowStatScore(existing)) {
          teamMap.set(row.teamId, row);
        }
      }
    }
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, teamMap]) => ({
      group,
      rows: [...teamMap.values()].sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor ||
          (a.fifaRank ?? 999) - (b.fifaRank ?? 999)
      ),
    }));
}
