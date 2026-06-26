import { useLiveOdds } from "../../hooks/useLiveOdds";
import type { MatchStatus } from "../../types";

type Props = {
  espnEventId: string;
  homeTeam: string;
  awayTeam: string;
  matchId?: string;
  matchStatus?: MatchStatus;
};

function formatOdds(val: number | null | undefined): string {
  if (val == null) return "—";
  return val > 0 ? `+${val}` : String(val);
}

export function OddsRow({ espnEventId, homeTeam, awayTeam, matchId, matchStatus }: Props) {
  const { odds } = useLiveOdds(matchId ?? espnEventId, espnEventId, matchStatus);

  if (!odds) return null;

  return (
    <div className="odds-row" aria-label="Sportsbook odds">
      <span className="odds-label">Odds</span>
      <span className="odds-cell odds-cell--home" title={homeTeam}>
        {formatOdds(odds.homeWin)}
      </span>
      <span className="odds-cell odds-cell--draw">Draw {formatOdds(odds.draw)}</span>
      <span className="odds-cell odds-cell--away" title={awayTeam}>
        {formatOdds(odds.awayWin)}
      </span>
    </div>
  );
}
