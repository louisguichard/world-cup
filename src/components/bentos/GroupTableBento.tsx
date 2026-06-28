import { useMemo } from "react";
import type { GroupStanding } from "../../types";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { getBestThirdBubbleTeamIds } from "../../lib/thirdPlaceLiveStatus";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { StandingThemeRow } from "../team/StandingThemeRow";
import { TeamFlag } from "../team/TeamFlag";
import { TeamClickTarget } from "../team/TeamClickTarget";

export interface GroupTableBentoProps {
  standing: GroupStanding;
}

export function GroupTableBento({ standing }: GroupTableBentoProps) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const bubbleTeamIds = useMemo(
    () => getBestThirdBubbleTeamIds(standings, qualContext),
    [standings, qualContext]
  );

  const tbl = APP_COPY.table;

  return (
    <article className="group-table-bento">
      <header className="group-table-bento-header">
        <h3>Group {standing.group}</h3>
      </header>
      <div className="group-table-scroll">
        <table className="group-table">
          <thead>
            <tr>
              <th>{tbl.rank}</th>
              <th>{tbl.team}</th>
              <th>{tbl.gamesPlayed}</th>
              <th>{tbl.wins}</th>
              <th>{tbl.ties}</th>
              <th>{tbl.losses}</th>
              <th>{tbl.goalsFor}</th>
              <th>{tbl.goalsAgainst}</th>
              <th>{tbl.goalDiff}</th>
              <th>{tbl.points}</th>
            </tr>
          </thead>
          <tbody>
            {standing.rows.map((row, index) => {
              const team = teams[row.teamId];
              const qual = computeQualificationStatus(row.teamId, standings, qualContext);
              const display = resolveQualificationDisplay(qual);
              return (
                <StandingThemeRow
                  key={row.teamId}
                  teamId={row.teamId}
                  accentAnimated={bubbleTeamIds.has(row.teamId)}
                  className={display.rowClass}
                >
                  <td>
                    <div className="group-table-rank">
                      <span>{index + 1}</span>
                      <QualificationStatusBadge qual={qual} size="xs" />
                    </div>
                  </td>
                  <td className="group-table-team">
                    <TeamClickTarget teamId={row.teamId} className="group-table-team-btn">
                      <TeamFlag team={team} teamId={row.teamId} />
                      <span className="team-name-text">{teamDisplayNameFromId(row.teamId, teams)}</span>
                    </TeamClickTarget>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.draws}</td>
                  <td>{row.losses}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>
                    {row.goalDifference >= 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                  <td>
                    <strong>{row.points}</strong>
                  </td>
                </StandingThemeRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}
