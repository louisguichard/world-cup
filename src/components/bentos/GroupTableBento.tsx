import { useMemo } from "react";
import type { GroupStanding } from "../../types";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { useStore } from "../../store";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { StandingThemeRow } from "../team/StandingThemeRow";

export interface GroupTableBentoProps {
  standing: GroupStanding;
}

function rowClass(index: number): string {
  if (index < 2) return "group-table-row--qualified";
  if (index === 2) return "group-table-row--at-risk";
  return "group-table-row--eliminated";
}

export function GroupTableBento({ standing }: GroupTableBentoProps) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  return (
    <article className="group-table-bento">
      <header className="group-table-bento-header">
        <h3>Group {standing.group}</h3>
      </header>
      <div className="group-table-scroll">
        <table className="group-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>MP</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {standing.rows.map((row, index) => {
              const team = teams[row.teamId];
              const qual = computeQualificationStatus(row.teamId, standings, qualContext);
              const showBadge = index < 2;
              return (
                <StandingThemeRow
                  key={row.teamId}
                  teamId={row.teamId}
                  className={rowClass(index)}
                >
                  <td>
                    <div className="group-table-rank">
                      <span>{index + 1}</span>
                      {showBadge ? (
                        <CertaintyBadge certainty={qual.certainty} size="xs" />
                      ) : null}
                    </div>
                  </td>
                  <td className="group-table-team">
                    {team?.logo ? <img src={team.logo} alt="" width={20} height={20} /> : null}
                    <span>{team?.shortName ?? row.teamId}</span>
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
