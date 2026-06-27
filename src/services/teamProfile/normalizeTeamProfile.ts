import type {
  SofaTeamDetails,
  SofaTeamMedia,
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

export function normalizeSofaTeamDetails(raw: unknown): SofaTeamDetails | null {
  if (!isRecord(raw)) return null;
  const id = num(raw.id);
  const name = str(raw.name);
  if (id == null || !name) return null;

  const manager = isRecord(raw.manager) ? raw.manager : null;

  return {
    id,
    name,
    shortName: str(raw.shortName),
    nameCode: str(raw.nameCode),
    imagePath: str(raw.imagePath),
    managerName: manager ? str(manager.name) ?? str(manager.shortName) : undefined,
    ranking: num(raw.ranking),
    userCount: num(raw.userCount),
  };
}

export function normalizeSofaTeamPlayers(raw: unknown): SofaTeamPlayer[] {
  const list = isRecord(raw) && Array.isArray(raw.players) ? raw.players : Array.isArray(raw) ? raw : [];
  const out: SofaTeamPlayer[] = [];

  for (const item of list) {
    if (!isRecord(item)) continue;
    const id = num(item.id);
    const name = str(item.name);
    if (id == null || !name) continue;

    const club = isRecord(item.team) ? item.team : null;
    const mv = isRecord(item.proposedMarketValue) ? item.proposedMarketValue : null;

    out.push({
      id,
      name,
      shortName: str(item.shortName),
      position: str(item.position),
      jerseyNumber: str(item.jerseyNumber),
      shirtNumber: num(item.shirtNumber),
      imagePath: str(item.imagePath),
      clubName: club ? str(club.name) ?? str(club.shortName) : undefined,
      marketValue:
        mv && num(mv.value) != null && str(mv.currency)
          ? { value: num(mv.value)!, currency: str(mv.currency)! }
          : undefined,
    });
  }

  return out.sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
}

export function normalizeSofaTeamStatistics(raw: unknown): SofaTeamStatistics | null {
  const stats = isRecord(raw) && isRecord(raw.statistics) ? raw.statistics : isRecord(raw) ? raw : null;
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

export function normalizeSofaTeamMedia(raw: unknown): SofaTeamMedia[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: SofaTeamMedia[] = [];

  for (const item of list) {
    if (!isRecord(item)) continue;
    const id = num(item.id);
    const title = str(item.title);
    if (id == null || !title) continue;
    out.push({
      id,
      title,
      description: str(item.description),
      thumbnailUrl: str(item.thumbnailUrl),
    });
  }

  return out;
}

export function formatMarketValue(value: number, currency: string): string {
  if (value >= 1_000_000) {
    return `${currency === "EUR" ? "€" : currency}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${currency === "EUR" ? "€" : currency}${Math.round(value / 1_000)}K`;
  }
  return `${currency} ${value}`;
}

export function positionLabel(code?: string): string {
  switch (code) {
    case "G":
      return "GK";
    case "D":
      return "DEF";
    case "M":
      return "MID";
    case "F":
      return "FWD";
    default:
      return code ?? "—";
  }
}
