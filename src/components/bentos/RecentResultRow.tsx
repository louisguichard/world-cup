import { completedMatchPillLabel } from "../../lib/matchStageLabel";
import { formatTimeAgo } from "../../lib/localDate";
import type { MergedMatch } from "../../types";
import { useStore } from "../../store";
import { useKnockoutPenaltyResult } from "../../hooks/useKnockoutPenaltyResult";
import { KnockoutResultScoreboard } from "../match/KnockoutResultScoreboard";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
  teamDisplayNameForMatch,
} from "../../lib/matchTeamDisplay";
import { isAdvancingTeam } from "../../lib/resolveMatchWinner";
import { TeamFlag } from "../team/TeamFlag";

const PLACEHOLDER_SHOOTOUT = { home: [], away: [], homeScore: 0, awayScore: 0 };

type ResultRowProps = {
  match: MergedMatch;
  onSelect: (teamId: string) => void;
};

function StandardResultRow({ match, onSelect }: ResultRowProps) {
  const teams = useStore((s) => s.teams);
  const resolvedHome = resolveMatchTeam(match, "home", teams);
  const resolvedAway = resolveMatchTeam(match, "away", teams);
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
  const pillLabel = completedMatchPillLabel(match);
  const ago = formatTimeAgo(match.date);
  const homeAdvancing = isAdvancingTeam(match, match.homeTeamId, teams);
  const awayAdvancing = isAdvancingTeam(match, match.awayTeamId, teams);
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  return (
    <button type="button" className="recent-result-row" onClick={() => onSelect(match.homeTeamId)}>
      <div className="fixture-matchup">
        <span
          className={`recent-result-team recent-result-team--home${homeAdvancing ? " recent-result-team--advancing" : ""}`}
        >
          <TeamFlag
            team={resolvedHome}
            teamId={flagTeamIdForMatch(match, "home", teams)}
            nameHint={scheduleNameHintForMatch(match, "home")}
            size="sm"
            compact
          />
          <span className="team-name-text">{homeName}</span>
        </span>
        <strong className="recent-result-score">{homeScore}</strong>
        <span className="result-match-card-sep">–</span>
        <strong className="recent-result-score">{awayScore}</strong>
        <span
          className={`recent-result-team recent-result-team--away${awayAdvancing ? " recent-result-team--advancing" : ""}`}
        >
          <TeamFlag
            team={resolvedAway}
            teamId={flagTeamIdForMatch(match, "away", teams)}
            nameHint={scheduleNameHintForMatch(match, "away")}
            size="sm"
            compact
          />
          <span className="team-name-text">{awayName}</span>
        </span>
      </div>
      <div className="fixture-matchup__meta">
        <span className="final-pill">{pillLabel}</span>
        {ago ? <span className="recent-result-ago">{ago}</span> : null}
      </div>
    </button>
  );
}

function PenaltyResultRow({ match, onSelect }: ResultRowProps) {
  const teams = useStore((s) => s.teams);
  const { showPenalties, shootout, winnerTeamId, stageLabel, loading } =
    useKnockoutPenaltyResult(match);
  const pillLabel = completedMatchPillLabel(match);
  const ago = formatTimeAgo(match.date);

  if (!showPenalties) return <StandardResultRow match={match} onSelect={onSelect} />;

  const hasConfirmedShootout =
    Boolean(shootout) && (shootout!.homeScore > 0 || shootout!.awayScore > 0);
  const penaltyLoading = !hasConfirmedShootout;

  return (
    <button
      type="button"
      className="recent-result-row recent-result-row--scoreboard"
      onClick={() => onSelect(match.homeTeamId)}
    >
      <KnockoutResultScoreboard
        match={match}
        shootout={hasConfirmedShootout ? shootout! : PLACEHOLDER_SHOOTOUT}
        teams={teams}
        winnerTeamId={winnerTeamId}
        stageLabel={stageLabel}
        compact
        loading={penaltyLoading || loading}
        meta={
          <>
            <span className="final-pill">{pillLabel}</span>
            {ago ? <span className="recent-result-ago">{ago}</span> : null}
          </>
        }
      />
    </button>
  );
}

export { StandardResultRow, PenaltyResultRow };
