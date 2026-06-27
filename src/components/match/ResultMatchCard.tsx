import type { MergedMatch } from "../../types";
import { formatKickoffDate } from "../../lib/formatKickoff";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useStore } from "../../store";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";
import { VenueLabel } from "../venue/VenueLabel";
import { MatchGoalScorers } from "./MatchGoalScorers";

export interface ResultMatchCardProps {
  match: MergedMatch;
  openTeamOnClick?: boolean;
}

export function ResultMatchCard({ match, openTeamOnClick }: ResultMatchCardProps) {
  const teams = useStore((s) => s.teams);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const matchEvents = useStore((s) => s.matchEvents);

  const events =
    matchEvents[match.id] ??
    matchEvents[match.matchId ?? ""] ??
    matchEvents[match.espnEventId ?? ""] ??
    [];

  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeName = teamDisplayName(home, match.homeTeamId);
  const awayName = teamDisplayName(away, match.awayTeamId);
  const kickoffDate = formatKickoffDate(match.date);

  return (
    <button
      type="button"
      className="result-match-card"
      role="article"
      aria-label={`${homeName} ${homeScore}–${awayScore} ${awayName}, Final`}
      onClick={() =>
        openTeamOnClick
          ? openTeamSheet(match.homeTeamId)
          : openMatchDetail(match.matchId ?? match.id, { from: "results" })
      }
    >
      <div className="result-match-card-meta">
        <span className="final-pill">FINAL</span>
        {kickoffDate ? <time dateTime={match.date}>{kickoffDate}</time> : null}
        <VenueLabel matchId={match.matchId ?? match.id} venueString={match.venue} inline compact />
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

      <MatchGoalScorers
        events={events}
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        homeTeam={home}
        awayTeam={away}
      />
    </button>
  );
}
