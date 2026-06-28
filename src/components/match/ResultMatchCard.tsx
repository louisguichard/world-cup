import type { MergedMatch } from "../../types";
import { formatKickoffDate } from "../../lib/formatKickoff";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
  teamDisplayNameForMatch,
} from "../../lib/matchTeamDisplay";
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

  const home = resolveMatchTeam(match, "home", teams);
  const away = resolveMatchTeam(match, "away", teams);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
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
          <TeamLabel team={home} displayName={homeName} nested />
        ) : (
          <TeamLabelById
            teamId={flagTeamIdForMatch(match, "home", teams)}
            nameHint={scheduleNameHintForMatch(match, "home")}
            displayName={homeName}
            nested
          />
        )}
        <strong className="result-match-card-score">{homeScore}</strong>
        <span className="result-match-card-sep">–</span>
        <strong className="result-match-card-score">{awayScore}</strong>
        {away ? (
          <TeamLabel team={away} displayName={awayName} align="right" nested />
        ) : (
          <TeamLabelById
            teamId={flagTeamIdForMatch(match, "away", teams)}
            nameHint={scheduleNameHintForMatch(match, "away")}
            displayName={awayName}
            align="right"
            nested
          />
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
