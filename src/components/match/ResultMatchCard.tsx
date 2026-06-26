import type { MergedMatch } from "../../types";
import { formatKickoffDate } from "../../lib/formatKickoff";
import { useStore } from "../../store";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";

export interface ResultMatchCardProps {
  match: MergedMatch;
}

export function ResultMatchCard({ match }: ResultMatchCardProps) {
  const teams = useStore((s) => s.teams);
  const openMatchDetail = useStore((s) => s.openMatchDetail);

  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeName = home?.shortName ?? home?.name ?? match.homeTeamId;
  const awayName = away?.shortName ?? away?.name ?? match.awayTeamId;
  const kickoffDate = formatKickoffDate(match.date);

  return (
    <button
      type="button"
      className="result-match-card"
      role="article"
      aria-label={`${homeName} ${homeScore}–${awayScore} ${awayName}, Final`}
      onClick={() => openMatchDetail(match.matchId ?? match.id, { from: "results" })}
    >
      <div className="result-match-card-meta">
        <span className="final-pill">FINAL</span>
        {kickoffDate ? <time dateTime={match.date}>{kickoffDate}</time> : null}
      </div>

      <div className="result-match-card-scoreline">
        {home ? <TeamLabel team={home} /> : <TeamLabelById teamId={match.homeTeamId} />}
        <strong className="result-match-card-score">{homeScore}</strong>
        <span className="result-match-card-sep">–</span>
        <strong className="result-match-card-score">{awayScore}</strong>
        {away ? (
          <TeamLabel team={away} align="right" />
        ) : (
          <TeamLabelById teamId={match.awayTeamId} align="right" />
        )}
      </div>
    </button>
  );
}
