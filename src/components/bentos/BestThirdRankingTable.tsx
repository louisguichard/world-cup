/** Shared best-third ranking table for Bracket timeline and Live graph. */
import type { RankingSnapshot } from "../../lib/buildRankingTimeline";
import {
  bubbleStateLabel,
  getThirdPlaceBubbleState,
  type CutoffCrossing,
  type ThirdPlaceBubbleState,
} from "../../lib/thirdPlaceLiveStatus";
import { buildQualificationContext } from "../../lib/qualification";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import type { GroupStanding, Team } from "../../types";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import styles from "./BestThirdRankingTable.module.css";

type Props = {
  snapshot: RankingSnapshot;
  teams: Record<string, Team>;
  standings: GroupStanding[];
  focusTeamIds?: string[];
  cutoffCrossings?: CutoffCrossing[];
  showBubbleColumn?: boolean;
};

function deltaLabel(positionBefore: number, positionAfter: number): { text: string; className: string } {
  const change = positionBefore - positionAfter;
  if (change > 0) return { text: `↑${change}`, className: styles.deltaUp };
  if (change < 0) return { text: `↓${Math.abs(change)}`, className: styles.deltaDown };
  return { text: "—", className: styles.deltaFlat };
}

function bubbleClass(state: ThirdPlaceBubbleState): string {
  switch (state) {
    case "safe":
      return styles.bubbleSafe;
    case "bubble":
      return styles.bubbleWarn;
    case "outside":
      return styles.bubbleOut;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function BestThirdRankingTable({
  snapshot,
  teams,
  standings,
  focusTeamIds = [],
  cutoffCrossings = [],
  showBubbleColumn = false,
}: Props) {
  const liveMatches = useStore((s) => s.liveMatches);
  const tbl = APP_COPY.table;
  const bt = APP_COPY.bestThird;
  const rows = snapshot.rankings.slice(0, 12);
  const deltaByTeam = new Map(snapshot.deltas.map((delta) => [delta.teamId, delta]));
  const focusSet = new Set(focusTeamIds);
  const crossingMap = new Map(cutoffCrossings.map((c) => [c.teamId, c.direction]));
  const qualContext = buildQualificationContext(Object.values(liveMatches), Object.values(teams));

  const maxPoints = Math.max(1, ...rows.map((r) => r.points));

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{tbl.rank}</th>
            <th>{tbl.team}</th>
            <th>{tbl.points}</th>
            <th>{tbl.goalDiff}</th>
            <th>{tbl.goalsFor}</th>
            <th>{tbl.group}</th>
            {showBubbleColumn ? <th>{tbl.status}</th> : null}
            <th>{tbl.change}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const team = teams[row.teamId];
            const delta = deltaByTeam.get(row.teamId);
            const positionChange = delta
              ? deltaLabel(delta.positionBefore, delta.positionAfter)
              : { text: "—", className: styles.deltaFlat };
            const isCutLine = index === 7;
            const rank = index + 1;
            const bubbleState = getThirdPlaceBubbleState(
              row.teamId,
              rank,
              snapshot.rankings,
              standings,
              qualContext
            );
            const crossing = crossingMap.get(row.teamId);
            const isFocus = focusSet.has(row.teamId);

            return (
              <tr
                key={row.teamId}
                className={[
                  isCutLine ? styles.cutLine : "",
                  index >= 8 ? styles.belowCut : "",
                  isFocus ? styles.focusRow : "",
                  crossing === "in" ? styles.cutoffIn : "",
                  crossing === "out" ? styles.cutoffOut : "",
                  delta?.crossedCutoff === "in" ? styles.cutoffIn : "",
                  delta?.crossedCutoff === "out" ? styles.cutoffOut : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-rank={rank}
              >
                <td>{rank}</td>
                <td>
                  <div className={styles.teamCell}>
                    <TeamFlag team={team} teamId={row.teamId} size="sm" />
                    <span className="team-name-text">{teamDisplayName(team, row.teamId)}</span>
                  </div>
                  <div
                    className={styles.pointBar}
                    style={{ width: `${Math.max(8, (row.points / maxPoints) * 100)}%` }}
                    aria-hidden
                  />
                </td>
                <td>
                  <strong>{row.points}</strong>
                </td>
                <td>
                  {row.goalDifference >= 0 ? "+" : ""}
                  {row.goalDifference}
                </td>
                <td>{row.goalsFor}</td>
                <td>{row.group}</td>
                {showBubbleColumn ? (
                  <td>
                    <span className={`${styles.bubblePill} ${bubbleClass(bubbleState)}`}>
                      {bubbleStateLabel(bubbleState)}
                    </span>
                  </td>
                ) : null}
                <td className={positionChange.className}>{positionChange.text}</td>
              </tr>
            );
          })}
          <tr className={styles.cutLabelRow}>
            <td colSpan={showBubbleColumn ? 8 : 7}>{bt.cutoffLabel}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
