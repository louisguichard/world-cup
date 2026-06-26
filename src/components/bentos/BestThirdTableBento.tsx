import { useMemo } from "react";
import { rankBestThirds } from "../../lib/bestThirds";
import type { GroupStanding, MergedMatch, TeamRecord } from "../../types";
import { useStore } from "../../store";
import { CertaintyBadge } from "../shared/CertaintyBadge";

export interface BestThirdTableBentoProps {
  standings: GroupStanding[];
}

type H2HResult = "W" | "D" | "L" | "N/A";

function gdClass(gd: number): string {
  if (gd > 0) return "best-third-gd--pos";
  if (gd < 0) return "best-third-gd--neg";
  return "best-third-gd--zero";
}

function disciplineClass(score: number): string {
  if (score === 0) return "best-third-discipline--clean";
  if (score >= -3) return "best-third-discipline--warn";
  return "best-third-discipline--bad";
}

function h2hBadgeClass(result: H2HResult): string {
  switch (result) {
    case "W":
      return "best-third-h2h--win";
    case "D":
      return "best-third-h2h--draw";
    case "L":
      return "best-third-h2h--loss";
    default:
      return "best-third-h2h--na";
  }
}

function computeH2H(
  teamId: string,
  thirdPlaceIds: Set<string>,
  matches: MergedMatch[]
): H2HResult {
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const match of matches) {
    if (!match.group || !match.locked) continue;
    const involvesTeam = match.homeTeamId === teamId || match.awayTeamId === teamId;
    if (!involvesTeam) continue;

    const opponentId = match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
    if (!thirdPlaceIds.has(opponentId) || opponentId === teamId) continue;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const isHome = match.homeTeamId === teamId;
    const teamScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;

    if (teamScore > oppScore) wins += 1;
    else if (teamScore < oppScore) losses += 1;
    else draws += 1;
  }

  if (wins + draws + losses === 0) return "N/A";
  if (wins > losses) return "W";
  if (losses > wins) return "L";
  return "D";
}

function rowClass(index: number): string {
  return index < 4 ? "group-table-row--qualified" : "group-table-row--eliminated";
}

export function BestThirdTableBento({ standings }: BestThirdTableBentoProps) {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  const ranked = useMemo(() => rankBestThirds(standings), [standings]);

  const thirdPlaceIds = useMemo(
    () => new Set(ranked.map((row) => row.teamId)),
    [ranked]
  );

  const lockedGroupMatches = useMemo(
    () => Object.values(liveMatches).filter((m) => m.group && m.locked),
    [liveMatches]
  );

  const h2hByTeam = useMemo(() => {
    const map = new Map<string, H2HResult>();
    for (const row of ranked) {
      map.set(row.teamId, computeH2H(row.teamId, thirdPlaceIds, lockedGroupMatches));
    }
    return map;
  }, [ranked, thirdPlaceIds, lockedGroupMatches]);

  return (
    <section className="best-third-table-bento" aria-label="Best third place teams">
      <header className="group-table-bento-header">
        <h3>Best 3rd — FIFA tiebreaker</h3>
        <p className="best-third-table-lead">All six third-placed teams ranked for the eight knockout berths.</p>
      </header>

      <div className="group-table-scroll">
        <table className="group-table best-third-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Pts</th>
              <th>GD</th>
              <th>GF</th>
              <th>W</th>
              <th>H2H</th>
              <th>Discipline</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row: TeamRecord, index: number) => {
              const team = teams[row.teamId];
              const h2h = h2hByTeam.get(row.teamId) ?? "N/A";
              return (
                <tr key={row.teamId} className={rowClass(index)}>
                  <td>
                    <div className="group-table-rank">
                      <span>{index + 1}</span>
                      {index < 8 ? <CertaintyBadge certainty="projected" size="xs" /> : null}
                    </div>
                  </td>
                  <td className="group-table-team">
                    {team?.logo ? <img src={team.logo} alt="" width={20} height={20} /> : null}
                    <span>{team?.shortName ?? row.teamId}</span>
                  </td>
                  <td>
                    <strong>{row.points}</strong>
                  </td>
                  <td className={gdClass(row.goalDifference)}>
                    {row.goalDifference >= 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                  <td>{row.goalsFor}</td>
                  <td>{row.wins}</td>
                  <td>
                    <span className={`best-third-h2h ${h2hBadgeClass(h2h)}`}>{h2h}</span>
                  </td>
                  <td className={disciplineClass(row.conduct)}>{row.conduct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="best-third-legend">
        <p>
          <strong>H2H</strong> — head-to-head record vs other third-placed teams (W/D/L).{" "}
          <strong>Discipline</strong> — fair play score: yellow −1, red −4, second yellow −5 (0 is clean).
        </p>
      </div>
    </section>
  );
}
