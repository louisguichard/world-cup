import { useEffect, useMemo, useRef, useState } from "react";
import type { GroupLetter, TeamRecord } from "../../types";
import { APP_COPY } from "../../lib/appCopy";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { useLiveGroupStandings } from "../../hooks/useLiveGroupStandings";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { StandingThemeRow } from "../team/StandingThemeRow";
import styles from "./LiveGroupStandingsPanel.module.css";

type Props = {
  group: GroupLetter;
  variant?: "panel" | "mini";
  /** When set, only these teams get the live-row highlight (defaults to all live teams in group). */
  highlightTeamIds?: string[];
};

type RowSnapshot = {
  rank: number;
  points: number;
  goalDifference: number;
};

function snapshotRows(rows: TeamRecord[]): Map<string, RowSnapshot> {
  const map = new Map<string, RowSnapshot>();
  rows.forEach((row, index) => {
    map.set(row.teamId, {
      rank: index + 1,
      points: row.points,
      goalDifference: row.goalDifference,
    });
  });
  return map;
}

function rowChanged(
  previous: Map<string, RowSnapshot> | null,
  row: TeamRecord,
  rank: number
): boolean {
  if (!previous) return false;
  const prior = previous.get(row.teamId);
  if (!prior) return true;
  return (
    prior.rank !== rank ||
    prior.points !== row.points ||
    prior.goalDifference !== row.goalDifference
  );
}

export function LiveGroupStandingsPanel({
  group,
  variant = "panel",
  highlightTeamIds,
}: Props) {
  const copy = APP_COPY.live.groupStandings;
  const tbl = APP_COPY.table;
  const teams = useStore((s) => s.teams);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const data = useLiveGroupStandings(group);
  const previousRowsRef = useRef<Map<string, RowSnapshot> | null>(null);
  const [changedIds, setChangedIds] = useState<Set<string>>(() => new Set());

  const standing = data?.standing;
  const liveTeamIds = highlightTeamIds?.length
    ? new Set(highlightTeamIds)
    : (data?.liveTeamIds ?? new Set<string>());

  const liveMatchCount = data?.liveMatchCount ?? 0;

  useEffect(() => {
    if (!standing) return;
    const nextChanged = new Set<string>();
    standing.rows.forEach((row, index) => {
      if (rowChanged(previousRowsRef.current, row, index + 1)) {
        nextChanged.add(row.teamId);
      }
    });
    setChangedIds(nextChanged);
    previousRowsRef.current = snapshotRows(standing.rows);
  }, [standing]);

  const subtitle = useMemo(() => {
    if (liveMatchCount > 1) return copy.sameGroupMulti(liveMatchCount);
    if (liveTeamIds.size > 0) return copy.updatesLive;
    return copy.updatesLive;
  }, [copy, liveMatchCount, liveTeamIds.size]);

  if (!standing || liveTeamIds.size === 0) return null;

  return (
    <section
      className={`${styles.liveGroupPanel}${variant === "mini" ? ` ${styles.liveGroupPanelMini}` : ""}`}
      aria-label={copy.ariaLabel(group)}
    >
      {variant === "panel" ? (
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{copy.title(group)}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} aria-hidden="true" />
            {copy.liveBadge}
          </span>
        </header>
      ) : (
        <header className={styles.header}>
          <h3 className={styles.title}>{copy.title(group)}</h3>
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} aria-hidden="true" />
            {copy.liveBadge}
          </span>
        </header>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{tbl.rank}</th>
              <th scope="col">{tbl.team}</th>
              <th scope="col">{tbl.points}</th>
              <th scope="col">{tbl.goalDiff}</th>
            </tr>
          </thead>
          <tbody>
            {standing.rows.map((row, index) => {
              const team = teams[row.teamId];
              const rank = index + 1;
              const isLiveTeam = liveTeamIds.has(row.teamId);
              const changed = changedIds.has(row.teamId);
              return (
                <StandingThemeRow
                  key={row.teamId}
                  teamId={row.teamId}
                  className={`${isLiveTeam ? styles.rowLive : ""}${changed ? ` ${styles.rowChanged}` : ""}`.trim()}
                >
                  <td className={styles.rankCell}>{rank}</td>
                  <td className={styles.teamCell}>
                    <button
                      type="button"
                      className={styles.teamBtn}
                      onClick={() => openTeamSheet(row.teamId)}
                    >
                      <TeamFlag team={team} teamId={row.teamId} size="sm" compact />
                      <span className="team-name-text">
                        {teamDisplayNameFromId(row.teamId, teams)}
                      </span>
                    </button>
                  </td>
                  <td className={`${styles.statCell} ${styles.pointsCell}`}>{row.points}</td>
                  <td className={styles.statCell}>
                    {row.goalDifference >= 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                </StandingThemeRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
