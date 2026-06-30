import { resolveCanonicalTeamId } from "../../data/wc2026TeamCatalog";
import type { MergedMatch } from "../../types";
import { useKnockoutPenaltyResult } from "../../hooks/useKnockoutPenaltyResult";
import { formatPenaltyResultLine } from "../../lib/formatPenaltyResultLine";
import { resolveMatchWinner } from "../../lib/resolveMatchWinner";
import { useStore } from "../../store";

type Props = {
  match: MergedMatch;
  /** Team-centric row: show score from this team's perspective */
  teamId?: string;
  perspective?: "home" | "away";
  className?: string;
};

export function CompactMatchScore({ match, teamId, perspective, className = "" }: Props) {
  const teams = useStore((s) => s.teams);
  const { showPenalties, shootout } = useKnockoutPenaltyResult(match);

  const homeCanon = resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
  const teamCanon = teamId ? resolveCanonicalTeamId(teamId, teams[teamId]) : undefined;

  const isHome =
    perspective === "home" ||
    (teamCanon != null && homeCanon === teamCanon);

  const homeFt = match.homeScore ?? 0;
  const awayFt = match.awayScore ?? 0;
  const leftFt = isHome ? homeFt : awayFt;
  const rightFt = isHome ? awayFt : homeFt;

  const winnerId = showPenalties && shootout ? resolveMatchWinner(match, teams, shootout) : undefined;
  const teamWonPens =
    winnerId != null && teamCanon != null
      ? resolveCanonicalTeamId(winnerId, teams[winnerId]) === teamCanon
      : false;

  let penLeft = shootout?.homeScore;
  let penRight = shootout?.awayScore;
  if (!isHome && shootout) {
    penLeft = shootout.awayScore;
    penRight = shootout.homeScore;
  }

  const penLine = showPenalties && shootout ? formatPenaltyResultLine(penLeft ?? 0, penRight ?? 0) : null;

  return (
    <span className={`compact-match-score ${className}`.trim()}>
      <span className="compact-match-score-ft">
        {match.homeScore !== undefined ? `${leftFt}–${rightFt}` : "vs"}
      </span>
      {penLine ? (
        <span className="compact-match-score-pens" aria-label={`Penalties ${penLeft} to ${penRight}`}>
          <span className="compact-match-score-pens-label">{penLine.prefix}</span>{" "}
          <span className={teamWonPens ? "compact-match-score-pens-winner" : ""}>{penLine.home}</span>
          <span className="compact-match-score-pens-sep">{penLine.sep}</span>
          <span className={!teamWonPens && teamCanon ? "compact-match-score-pens-winner" : ""}>
            {penLine.away}
          </span>
        </span>
      ) : null}
    </span>
  );
}
