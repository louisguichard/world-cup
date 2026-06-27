import type {
  SofaTeamDetails,
  SofaTeamMatchSummary,
  SofaTeamPlayer,
  SofaTeamStatistics,
} from "../../types/teamProfile";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function normalizeSofaRapidTeamDetails(raw: unknown): SofaTeamDetails | null {
  if (!isRecord(raw)) return null;
  const team = isRecord(raw.team) ? raw.team : raw;
  const id = num(team.id);
  const name = str(team.name);
  if (id == null || !name) return null;

  const manager = isRecord(team.manager) ? team.manager : null;

  return {
    id,
    name,
    shortName: str(team.shortName),
    nameCode: str(team.nameCode),
    imagePath: str(team.imagePath),
    managerName: manager ? str(manager.name) ?? str(manager.shortName) : undefined,
    ranking: num(team.ranking),
    userCount: num(team.userCount),
  };
}

export function normalizeSofaRapidSquad(raw: unknown): SofaTeamPlayer[] {
  const rows = isRecord(raw) && Array.isArray(raw.players) ? raw.players : [];
  const out: SofaTeamPlayer[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const player = isRecord(row.player) ? row.player : row;
    const id = num(player.id);
    const name = str(player.name);
    if (id == null || !name) continue;

    const club = isRecord(player.team) ? player.team : null;

    out.push({
      id,
      name,
      shortName: str(player.shortName),
      position: str(player.position),
      jerseyNumber: str(player.jerseyNumber),
      shirtNumber: num(player.jerseyNumber) ?? num(player.shirtNumber),
      imagePath: str(player.imagePath),
      clubName: club ? str(club.name) ?? str(club.shortName) : undefined,
    });
  }

  return out.sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
}

export function normalizeSofaRapidStatistics(raw: unknown): SofaTeamStatistics | null {
  const stats = isRecord(raw) && isRecord(raw.statistics) ? raw.statistics : null;
  if (!stats) return null;

  return {
    goalsScored: num(stats.goalsScored),
    goalsConceded: num(stats.goalsConceded),
    assists: num(stats.assists),
    shots: num(stats.shots),
    shotsOnTarget: num(stats.shotsOnTarget),
    averageBallPossession: num(stats.averageBallPossession),
    cleanSheets: num(stats.cleanSheets),
    yellowCards: num(stats.yellowCards),
    redCards: num(stats.redCards),
    avgRating: num(stats.avgRating),
    corners: num(stats.corners),
    bigChances: num(stats.bigChances),
    successfulDribbles: num(stats.successfulDribbles),
    accuratePassesPercentage: num(stats.accuratePassesPercentage),
  };
}

export function normalizeSofaRapidRankings(raw: unknown): number | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.rankings)) return undefined;
  for (const row of raw.rankings) {
    if (!isRecord(row)) continue;
    const team = isRecord(row.team) ? row.team : row;
    const ranking = num(team.ranking);
    if (ranking != null) return ranking;
  }
  return undefined;
}

function scoreFromEvent(event: Record<string, unknown>, side: "home" | "away"): number | undefined {
  const score = isRecord(event[side === "home" ? "homeScore" : "awayScore"])
    ? (event[side === "home" ? "homeScore" : "awayScore"] as Record<string, unknown>)
    : null;
  return num(score?.current) ?? num(score?.display);
}

export function normalizeSofaRapidEvents(raw: unknown, limit = 8): SofaTeamMatchSummary[] {
  const events = isRecord(raw) && Array.isArray(raw.events) ? raw.events : [];
  const out: SofaTeamMatchSummary[] = [];

  for (const event of events.slice(0, limit)) {
    if (!isRecord(event)) continue;
    const id = num(event.id);
    const home = isRecord(event.homeTeam) ? event.homeTeam : null;
    const away = isRecord(event.awayTeam) ? event.awayTeam : null;
    const homeName = home ? str(home.name) : undefined;
    const awayName = away ? str(away.name) : undefined;
    if (id == null || !homeName || !awayName) continue;

    const ts = num(event.startTimestamp);
    const tournament = isRecord(event.tournament) ? str(event.tournament.name) : undefined;
    const status = isRecord(event.status) ? str(event.status.type) : undefined;

    out.push({
      id,
      date: ts ? new Date(ts * 1000).toISOString() : "",
      homeTeam: homeName,
      awayTeam: awayName,
      homeScore: scoreFromEvent(event, "home"),
      awayScore: scoreFromEvent(event, "away"),
      tournament,
      status,
    });
  }

  return out;
}

export function normalizeSofaRapidTournamentNames(raw: unknown): string[] {
  const list =
    isRecord(raw) && Array.isArray(raw.uniqueTournaments) ? raw.uniqueTournaments : [];
  return list
    .filter(isRecord)
    .map((t) => str(t.name))
    .filter((n): n is string => Boolean(n));
}

export function normalizeSofaRapidH2hEvents(raw: unknown): SofaTeamMatchSummary[] {
  const events = isRecord(raw) && Array.isArray(raw.events) ? raw.events : [];
  return normalizeSofaRapidEvents({ events }, events.length);
}
