import { useMemo } from "react";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
import { rankAliveBestThirds } from "../../lib/bestThirds";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import type { GroupStanding, MergedMatch, TeamRecord } from "../../types";
import { useStore } from "../../store";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { TeamFlag } from "../team/TeamFlag";

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

function rowClasses(index: number, qualRowClass: string): string {
  const cut = index === 7 ? "best-third-row--cutline" : "";
  return [qualRowClass, cut].filter(Boolean).join(" ");
}

export function BestThirdTableBento({ standings }: BestThirdTableBentoProps) {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const ranked = useMemo(() => rankAliveBestThirds(standings, qualContext), [standings, qualContext]);

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

  const copy = APP_COPY.bestThirdTable;
  const tbl = APP_COPY.table;

  return (
    <section className="best-third-table-bento" aria-label={copy.title}>
      <header className="group-table-bento-header">
        <h3>{copy.title}</h3>
        <p className="best-third-table-lead">{copy.lead}</p>
      </header>

      <div className="group-table-scroll">
        <table className="group-table best-third-table">
          <thead>
            <tr>
              <th>{tbl.rank}</th>
              <th>{tbl.team}</th>
              <th>{tbl.points}</th>
              <th>{tbl.goalDiff}</th>
              <th>{tbl.goalsFor}</th>
              <th>{tbl.wins}</th>
              <th>{copy.h2h}</th>
              <th>{copy.discipline}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row: TeamRecord, index: number) => {
              const team = teams[row.teamId];
              const h2h = h2hByTeam.get(row.teamId) ?? "N/A";
              const qual = computeQualificationStatus(row.teamId, standings, qualContext);
              const display = resolveQualificationDisplay(qual);
              return (
                <tr key={row.teamId} className={rowClasses(index, display.rowClass)}>
                  <td>
                    <div className="group-table-rank">
                      <span>{index + 1}</span>
                      <QualificationStatusBadge qual={qual} size="xs" />
                    </div>
                  </td>
                  <td className="group-table-team">
                    <TeamFlag team={team} teamId={row.teamId} size="sm" />
                    <span className="team-name-text">{teamDisplayNameFromId(row.teamId, teams)}</span>
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
        <p>{copy.legend}</p>
      </div>
    </section>
  );
}
