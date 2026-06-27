import type { TournamentProfileBundle } from "../../types/teamProfile";
import {
  SOFA_RAPID_WC_SEASON_ID,
  SOFA_RAPID_WC_TOURNAMENT_ID,
} from "../../config/sofascoreRapidEndpoints";
import {
  delay,
  fetchTournamentCupTreesRaw,
  fetchTournamentDetailRaw,
  fetchTournamentSeasonsRaw,
  fetchTournamentStandingsRaw,
  fetchTournamentTopPlayersRaw,
  fetchTournamentTopTeamsRaw,
} from "../SofaScoreRapidClient";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizeStandings(raw: unknown): TournamentProfileBundle["standingsGroups"] {
  const standings = isRecord(raw) && Array.isArray(raw.standings) ? raw.standings : [];
  const groups: TournamentProfileBundle["standingsGroups"] = [];

  for (const group of standings) {
    if (!isRecord(group)) continue;
    const id = num(group.id) ?? 0;
    const tournament = isRecord(group.tournament) ? group.tournament : null;
    const name = tournament ? str(tournament.name) ?? `Group ${id}` : `Group ${id}`;
    const rowsRaw = Array.isArray(group.rows) ? group.rows : [];
    const rows = rowsRaw
      .filter(isRecord)
      .map((row) => {
        const team = isRecord(row.team) ? row.team : null;
        return {
          teamName: team ? str(team.name) ?? "—" : "—",
          position: num(row.position) ?? 0,
          points: num(row.points) ?? 0,
        };
      })
      .filter((r) => r.teamName !== "—");

    if (rows.length > 0) groups.push({ id, name, rows });
  }

  return groups;
}

function normalizeTopPlayers(raw: unknown): TournamentProfileBundle["topPlayers"] {
  if (!isRecord(raw) || !isRecord(raw.topPlayers)) return [];
  const rating = Array.isArray(raw.topPlayers.rating) ? raw.topPlayers.rating : [];
  return rating
    .filter(isRecord)
    .slice(0, 10)
    .map((entry) => {
      const stats = isRecord(entry.statistics) ? entry.statistics : entry;
      const player = isRecord(entry.player) ? entry.player : null;
      const team = player && isRecord(player.team) ? player.team : null;
      return {
        name: player ? str(player.name) ?? "—" : "—",
        team: team ? str(team.name) ?? "—" : "—",
        rating: num(stats?.rating) ?? 0,
      };
    })
    .filter((p) => p.name !== "—");
}

function normalizeTopTeams(raw: unknown): TournamentProfileBundle["topTeams"] {
  if (!isRecord(raw) || !isRecord(raw.topTeams)) return [];
  const avg = Array.isArray(raw.topTeams.avgRating) ? raw.topTeams.avgRating : [];
  return avg
    .filter(isRecord)
    .slice(0, 10)
    .map((entry) => {
      const team = isRecord(entry.team) ? entry.team : null;
      const stats = isRecord(entry.statistics) ? entry.statistics : entry;
      return {
        name: team ? str(team.name) ?? "—" : "—",
        rating: num(stats?.rating) ?? num(entry.rating) ?? 0,
      };
    })
    .filter((t) => t.name !== "—");
}

function normalizeCupTrees(raw: unknown): string[] {
  const trees = isRecord(raw) && Array.isArray(raw.cupTrees) ? raw.cupTrees : [];
  return trees.filter(isRecord).map((t) => str(t.name)).filter((n): n is string => Boolean(n));
}

export async function fetchTournamentProfileBundleRapid(): Promise<TournamentProfileBundle | null> {
  const detailRaw = await fetchTournamentDetailRaw();
  await delay(400);
  const seasonsRaw = await fetchTournamentSeasonsRaw();
  await delay(400);
  const standingsRaw = await fetchTournamentStandingsRaw();
  await delay(400);
  const topPlayersRaw = await fetchTournamentTopPlayersRaw();
  await delay(400);
  const topTeamsRaw = await fetchTournamentTopTeamsRaw();
  await delay(400);
  const cupTreesRaw = await fetchTournamentCupTreesRaw();

  if (!detailRaw && !seasonsRaw) return null;

  const detail = isRecord(detailRaw)
    ? isRecord(detailRaw.uniqueTournament)
      ? detailRaw.uniqueTournament
      : detailRaw
    : null;

  const seasons = isRecord(seasonsRaw) && Array.isArray(seasonsRaw.seasons)
    ? seasonsRaw.seasons
    : Array.isArray(seasonsRaw)
      ? seasonsRaw
      : [];

  return {
    fetchedAt: new Date().toISOString(),
    uniqueTournamentId: num(detail?.id) ?? SOFA_RAPID_WC_TOURNAMENT_ID,
    name: str(detail?.name),
    slug: str(detail?.slug),
    imagePath: isRecord(detail?.logo) ? str(detail.logo) : str(detail?.imagePath),
    seasons: seasons
      .filter(isRecord)
      .map((s) => ({
        id: num(s.id) ?? 0,
        name: str(s.name) ?? "",
        year: str(s.year) ?? "",
      }))
      .filter((s) => s.id > 0),
    standingsGroups: normalizeStandings(standingsRaw),
    topPlayers: normalizeTopPlayers(topPlayersRaw),
    topTeams: normalizeTopTeams(topTeamsRaw),
    cupTreeNames: normalizeCupTrees(cupTreesRaw),
  };
}
