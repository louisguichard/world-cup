import type { OddsSnapshot } from "../types";

export type OddsOutcomeSide = "home" | "draw" | "away";

export type OddsOutcomeRow = {
  side: OddsOutcomeSide;
  teamLabel: string;
  american: number;
  impliedPercent: number;
  isFavorite: boolean;
};

export type MatchOddsSummary = {
  rows: OddsOutcomeRow[];
  favoriteSide: OddsOutcomeSide | null;
  favoriteTeam: string | null;
  favoriteExplain: string;
  sourceExplain: string;
};

/** Turn American moneyline (e.g. -150, +200) into a win chance percent. */
export function americanToImpliedPercent(american: number): number {
  if (!Number.isFinite(american) || american === 0) return 0;
  if (american < 0) {
    const abs = Math.abs(american);
    return (abs / (abs + 100)) * 100;
  }
  return (100 / (american + 100)) * 100;
}

export function formatAmericanOdds(american: number | null | undefined): string {
  if (american == null || american === 0) return "—";
  return american > 0 ? `+${american}` : String(american);
}

/** Plain sentence for one American odds number. */
export function explainAmericanOdds(american: number): string {
  if (!Number.isFinite(american) || american === 0) return "No price listed.";
  if (american < 0) {
    const abs = Math.abs(american);
    return `A ${abs} to 100 bet — you risk $${abs} to win $100 if this happens.`;
  }
  return `A 100 to ${american} bet — you risk $100 to win $${american} if this happens.`;
}

function pickFavorite(rows: OddsOutcomeRow[]): OddsOutcomeRow | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => (row.impliedPercent > best.impliedPercent ? row : best));
}

export function buildMatchOddsSummary(
  odds: OddsSnapshot,
  homeTeam: string,
  awayTeam: string,
  copy: {
    drawLabel: string;
    toAdvanceLabel: string;
    favoriteLead: (team: string, pct: number) => string;
    drawFavoriteLead: (pct: number) => string;
    sourcePolymarket: string;
    sourceSportsbook: string;
    sourceGeneric: string;
  }
): MatchOddsSummary {
  const homeRow: OddsOutcomeRow = {
    side: "home",
    teamLabel: odds.twoWay ? `${homeTeam} to advance` : homeTeam,
    american: odds.homeWin,
    impliedPercent: americanToImpliedPercent(odds.homeWin),
    isFavorite: false,
  };

  const awayRow: OddsOutcomeRow = {
    side: "away",
    teamLabel: odds.twoWay ? `${awayTeam} to advance` : awayTeam,
    american: odds.awayWin,
    impliedPercent: americanToImpliedPercent(odds.awayWin),
    isFavorite: false,
  };

  const rows: OddsOutcomeRow[] = [homeRow];

  if (!odds.twoWay) {
    rows.push({
      side: "draw",
      teamLabel: copy.drawLabel,
      american: odds.draw,
      impliedPercent: americanToImpliedPercent(odds.draw),
      isFavorite: false,
    });
  }

  rows.push(awayRow);

  const comparable = rows.filter((r) => r.side !== "draw" || !odds.twoWay);
  const favorite = pickFavorite(comparable);
  if (favorite) {
    favorite.isFavorite = true;
  }

  const sourceExplain =
    odds.source === "polymarket"
      ? copy.sourcePolymarket
      : odds.source === "sportsbook"
        ? copy.sourceSportsbook
        : copy.sourceGeneric;

  let favoriteExplain = "";
  if (favorite?.side === "draw") {
    favoriteExplain = copy.drawFavoriteLead(Math.round(favorite.impliedPercent));
  } else if (favorite) {
    favoriteExplain = copy.favoriteLead(favorite.teamLabel, Math.round(favorite.impliedPercent));
  }

  return {
    rows,
    favoriteSide: favorite?.side ?? null,
    favoriteTeam: favorite && favorite.side !== "draw" ? favorite.teamLabel : null,
    favoriteExplain,
    sourceExplain,
  };
}

export function explainTitleOddsPercent(percent: number): string {
  if (!Number.isFinite(percent) || percent <= 0) return "We do not have a win-the-tournament price for this team yet.";
  if (percent >= 20) {
    return `About ${percent.toFixed(1)} out of 100 people trading this market think this team wins the whole World Cup. That is a strong favorite.`;
  }
  if (percent >= 8) {
    return `About ${percent.toFixed(1)} out of 100 traders pick this team to win it all. They are in the mix, but not the clear favorite.`;
  }
  return `About ${percent.toFixed(1)} out of 100 traders pick this team to win the World Cup. That makes them a long shot — possible, but not expected.`;
}
