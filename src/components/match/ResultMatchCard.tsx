import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
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
}

export function ResultMatchCard({ match }: ResultMatchCardProps) {
  const teams = useStore((s) => s.teams);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const matchEvents = useStore((s) => s.matchEvents);

  const events =
    matchEvents[match.id] ??
    matchEvents[match.matchId ?? ""] ??
    matchEvents[match.espnEventId ?? ""] ??
    [];

  const home = resolveTeamFromStore(teams, match.homeTeamId);
  const away = resolveTeamFromStore(teams, match.awayTeamId);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeName = teamDisplayName(home, match.homeTeamId, teams);
  const awayName = teamDisplayName(away, match.awayTeamId, teams);
  const kickoffDate = formatKickoffDate(match.date);

  return (
    <article
      className="result-match-card result-match-card--interactive"
      role="button"
      tabIndex={0}
      aria-label={`${homeName} ${homeScore}–${awayScore} ${awayName}, Final`}
      onClick={() => openMatchDetail(match.matchId ?? match.id, { from: "results" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMatchDetail(match.matchId ?? match.id, { from: "results" });
        }
      }}
    >
      <div className="result-match-card-meta">
        <span className="final-pill">FINAL</span>
        {kickoffDate ? <time dateTime={match.date}>{kickoffDate}</time> : null}
        <VenueLabel matchId={match.matchId ?? match.id} venueString={match.venue} inline compact />
      </div>

      <div className="result-match-card-scoreline">
        {home ? (
          <TeamLabel team={home} nested />
        ) : (
          <TeamLabelById teamId={match.homeTeamId} nested />
        )}
        <strong className="result-match-card-score">{homeScore}</strong>
        <span className="result-match-card-sep">–</span>
        <strong className="result-match-card-score">{awayScore}</strong>
        {away ? (
          <TeamLabel team={away} align="right" nested />
        ) : (
          <TeamLabelById teamId={match.awayTeamId} align="right" nested />
        )}
      </div>

      <MatchGoalScorers
        events={events}
        homeTeamId={match.homeTeamId}
        awayTeamId={match.awayTeamId}
        homeTeam={home}
        awayTeam={away}
      />
    </article>
  );
}
