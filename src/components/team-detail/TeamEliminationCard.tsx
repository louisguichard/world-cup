import { APP_COPY } from "../../lib/appCopy";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { TeamTournamentStatus } from "../../lib/teamTournamentStatus";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { CompactMatchScore } from "../match/CompactMatchScore";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import type { MergedMatch } from "../../types";

type Props = {
  status: Extract<TeamTournamentStatus, { phase: "eliminated" }>;
  teamId: string;
};

export function TeamEliminationCard({ status, teamId }: Props) {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const openMatchDetail = useStore((s) => s.openMatchDetail);

  const opponent = resolveTeamFromStore(teams, status.opponentId);
  const match = liveMatches[status.matchId] as MergedMatch | undefined;

  const ftLine = status.teamWasHome
    ? `${status.ftHome}–${status.ftAway}`
    : `${status.ftAway}–${status.ftHome}`;

  const pensLine =
    status.viaPenalties && status.penHome != null && status.penAway != null
      ? status.teamWasHome
        ? `penalties ${status.penHome}–${status.penAway}`
        : `penalties ${status.penAway}–${status.penHome}`
      : null;

  return (
    <section className="team-sheet-elimination" aria-labelledby={`team-exit-${teamId}`}>
      <h3 id={`team-exit-${teamId}`}>{APP_COPY.knockoutStory.tournamentExitTitle}</h3>
      <p className="team-sheet-elimination-lead">
        <strong>{status.label}</strong>
        {opponent ? (
          <>
            {" "}
            — lost to {teamDisplayName(opponent, status.opponentId)}
            {status.viaPenalties ? " on penalties" : ""} ({ftLine}
            {pensLine ? `, ${pensLine}` : ""}).
          </>
        ) : (
          <> ({ftLine}{pensLine ? `, ${pensLine}` : ""}).</>
        )}
      </p>
      {match ? (
        <div className="team-sheet-elimination-match">
          <TeamFlag team={opponent} teamId={status.opponentId} size="sm" compact />
          <span className="team-name-text">{teamDisplayName(opponent, status.opponentId)}</span>
          <CompactMatchScore match={match} teamId={teamId} />
          <button
            type="button"
            className="knockout-story-btn"
            onClick={() => openMatchDetail(status.matchId, { from: "live" })}
          >
            {APP_COPY.knockoutStory.viewDecidingMatch}
          </button>
        </div>
      ) : null}
    </section>
  );
}
