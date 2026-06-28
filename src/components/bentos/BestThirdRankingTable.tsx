import { useRef } from "react";
import type { RankingSnapshot } from "../../lib/buildRankingTimeline";
import {
  bubbleStateLabel,
  getThirdPlaceBubbleState,
  type CutoffCrossing,
  type ThirdPlaceBubbleState,
} from "../../lib/thirdPlaceLiveStatus";
import { buildThirdPlaceCutoffScenario, CUTOFF_RANK } from "../../lib/thirdPlaceCutoffScenario";
import type { QualificationMatchContext } from "../../lib/thirdPlaceQualification";
import { buildQualificationContext } from "../../lib/qualification";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import type { GroupStanding, Team, TeamRecord } from "../../types";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { TeamClickTarget } from "../team/TeamClickTarget";
import { ThirdPlaceCutoffPopover } from "./ThirdPlaceCutoffPopover";
import styles from "./BestThirdRankingTable.module.css";

type Props = {
  snapshot: RankingSnapshot;
  teams: Record<string, Team>;
  standings: GroupStanding[];
  focusTeamIds?: string[];
  cutoffCrossings?: CutoffCrossing[];
  showBubbleColumn?: boolean;
  ranked?: TeamRecord[];
  qualContext?: QualificationMatchContext;
};

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

function RankTableRow({
  row,
  team,
  rank,
  positionChange,
  bubbleState,
  showBubbleColumn,
  maxPoints,
  cutoffScenario,
  teams,
  rowClassName,
}: {
  row: TeamRecord;
  team: Team | undefined;
  rank: number;
  positionChange: { text: string; className: string };
  bubbleState: ThirdPlaceBubbleState;
  showBubbleColumn: boolean;
  maxPoints: number;
  cutoffScenario: ReturnType<typeof buildThirdPlaceCutoffScenario>;
  teams: Record<string, Team>;
  rowClassName: string;
}) {
  const anchorRef = useRef<HTMLTableRowElement>(null);

  return (
    <tr ref={anchorRef} className={rowClassName} data-rank={rank}>
      <td>{rank}</td>
      <td>
        <TeamClickTarget teamId={row.teamId} className={styles.teamCellBtn} options={{ tab: "context" }}>
          <div className={styles.teamCell}>
            <TeamFlag team={team} teamId={row.teamId} size="sm" />
            <span className="team-name-text">{teamDisplayNameFromId(row.teamId, teams)}</span>
          </div>
        </TeamClickTarget>
        <div
          className={styles.pointBar}
          style={{ width: `${Math.max(8, (row.points / maxPoints) * 100)}%` }}
          aria-hidden
        />
        {rank === CUTOFF_RANK && cutoffScenario ? (
          <ThirdPlaceCutoffPopover scenario={cutoffScenario} teams={teams} anchorRef={anchorRef} />
        ) : null}
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
}

function deltaLabel(positionBefore: number, positionAfter: number): { text: string; className: string } {
  const change = positionBefore - positionAfter;
  if (change > 0) return { text: `↑${change}`, className: styles.deltaUp };
  if (change < 0) return { text: `↓${Math.abs(change)}`, className: styles.deltaDown };
  return { text: "—", className: styles.deltaFlat };
}

export function BestThirdRankingTable({
  snapshot,
  teams,
  standings,
  focusTeamIds = [],
  cutoffCrossings = [],
  showBubbleColumn = false,
  ranked: rankedProp,
  qualContext: qualContextProp,
}: Props) {
  const liveMatches = useStore((s) => s.liveMatches);
  const tbl = APP_COPY.table;
  const bt = APP_COPY.bestThird;
  const rows = snapshot.rankings.slice(0, 12);
  const deltaByTeam = new Map(snapshot.deltas.map((delta) => [delta.teamId, delta]));
  const focusSet = new Set(focusTeamIds);
  const crossingMap = new Map(cutoffCrossings.map((c) => [c.teamId, c.direction]));
  const qualContext =
    qualContextProp ?? buildQualificationContext(Object.values(liveMatches), Object.values(teams));
  const ranked = rankedProp ?? snapshot.rankings;

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
            const cutoffScenario =
              rank === CUTOFF_RANK
                ? buildThirdPlaceCutoffScenario(row.teamId, ranked, standings, qualContext)
                : null;

            return (
              <RankTableRow
                key={row.teamId}
                row={row}
                team={team}
                rank={rank}
                positionChange={positionChange}
                bubbleState={bubbleState}
                showBubbleColumn={showBubbleColumn}
                maxPoints={maxPoints}
                cutoffScenario={cutoffScenario}
                teams={teams}
                rowClassName={[
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
              />
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
