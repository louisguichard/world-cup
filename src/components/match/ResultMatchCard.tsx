import type { MergedMatch } from "../../types";
import { useMemo } from "react";
import { completedMatchPillLabel } from "../../lib/matchStageLabel";
import { formatKickoffDate } from "../../lib/formatKickoff";
import { teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { resolveDisplayMatch } from "../../lib/resolveDisplayMatch";
import { resolveEventsForMatch } from "../../lib/resolveMatchEvents";
import { useMaterializedMatchIndex } from "../../hooks/useMaterializedMatchIndex";
import { useKnockoutPenaltyResult } from "../../hooks/useKnockoutPenaltyResult";
import { useStore } from "../../store";
import { VenueLabel } from "../venue/VenueLabel";
import { MatchGoalScorers } from "./MatchGoalScorers";
import { KnockoutResultScoreboard } from "./KnockoutResultScoreboard";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
} from "../../lib/matchTeamDisplay";
import { isAdvancingTeam } from "../../lib/resolveMatchWinner";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";

const PLACEHOLDER_SHOOTOUT = { home: [], away: [], homeScore: 0, awayScore: 0 };

export interface ResultMatchCardProps {
  match: MergedMatch;
}

export function ResultMatchCard({ match: rawMatch }: ResultMatchCardProps) {
  const teams = useStore((s) => s.teams);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const matchEvents = useStore((s) => s.matchEvents);
  const materializedIndex = useMaterializedMatchIndex();

  const match = useMemo(
    () => resolveDisplayMatch(rawMatch, materializedIndex),
    [rawMatch, materializedIndex]
  );

  const events = useMemo(
    () => resolveEventsForMatch(match, matchEvents, teams),
    [match, matchEvents, teams]
  );

  const { showPenalties, shootout, winnerTeamId, stageLabel, loading } =
    useKnockoutPenaltyResult(match);

  const home = resolveMatchTeam(match, "home", teams);
  const away = resolveMatchTeam(match, "away", teams);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
  const kickoffDate = formatKickoffDate(match.date);
  const pillLabel = completedMatchPillLabel(match);
  const homeAdvancing = isAdvancingTeam(match, match.homeTeamId, teams, shootout);
  const awayAdvancing = isAdvancingTeam(match, match.awayTeamId, teams, shootout);

  const hasConfirmedShootout =
    Boolean(shootout) && (shootout!.homeScore > 0 || shootout!.awayScore > 0);
  const penaltyLoading = showPenalties && !hasConfirmedShootout;

  const ariaLabel =
    showPenalties && hasConfirmedShootout
      ? `${homeName} ${homeScore}–${awayScore} ${awayName}, penalties ${shootout!.homeScore}–${shootout!.awayScore}, ${stageLabel ?? "Final"}`
      : `${homeName} ${homeScore}–${awayScore} ${awayName}, Final`;

  return (
    <article
      className="result-match-card result-match-card--interactive"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => openMatchDetail(match.matchId ?? match.id, { from: "results" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openMatchDetail(match.matchId ?? match.id, { from: "results" });
        }
      }}
    >
      <div className="result-match-card-meta">
        <span className="final-pill">{pillLabel}</span>
        {kickoffDate ? <time dateTime={match.date}>{kickoffDate}</time> : null}
        <VenueLabel matchId={match.matchId ?? match.id} venueString={match.venue} inline />
      </div>

      <div className="fixture-card-body">
        {showPenalties ? (
          <KnockoutResultScoreboard
            match={match}
            shootout={hasConfirmedShootout ? shootout! : PLACEHOLDER_SHOOTOUT}
            teams={teams}
            winnerTeamId={winnerTeamId}
            stageLabel={stageLabel}
            loading={penaltyLoading || loading}
          />
        ) : (
          <div className="score-line fixture-matchup">
            <div
              className={`result-match-card-team${homeAdvancing ? " result-match-card-team--advancing" : ""}`}
            >
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
            </div>
            <strong className="result-match-card-score">{homeScore}</strong>
            <span className="result-match-card-sep">–</span>
            <strong className="result-match-card-score">{awayScore}</strong>
            <div
              className={`result-match-card-team${awayAdvancing ? " result-match-card-team--advancing" : ""}`}
            >
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
          </div>
        )}

        <MatchGoalScorers
          events={events}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
          homeTeam={home}
          awayTeam={away}
        />
      </div>
    </article>
  );
}
