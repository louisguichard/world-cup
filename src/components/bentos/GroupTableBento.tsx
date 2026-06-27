import { useMemo } from "react";
import type { GroupStanding } from "../../types";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { StandingThemeRow } from "../team/StandingThemeRow";
import { TeamFlag } from "../team/TeamFlag";

export interface GroupTableBentoProps {
  standing: GroupStanding;
}

export function GroupTableBento({ standing }: GroupTableBentoProps) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
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
                  className={display.rowClass}
                >
                  <td>
                    <div className="group-table-rank">
                      <span>{index + 1}</span>
                      <QualificationStatusBadge qual={qual} size="xs" />
                    </div>
                  </td>
                  <td className="group-table-team">
                    <button
                      type="button"
                      className="group-table-team-btn"
                      onClick={() => openTeamSheet(row.teamId)}
                    >
                      <TeamFlag team={team} teamId={row.teamId} />
                      <span className="team-name-text">{teamDisplayName(team, row.teamId)}</span>
                    </button>
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
