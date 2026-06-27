import { useMemo, useState } from "react";
import { useBestThirdLiveGraphState } from "../../hooks/useBestThirdLiveGraphState";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { BestThirdRankingTable } from "./BestThirdRankingTable";
import { BestThirdTimelineChart } from "./BestThirdTimelineChart";
import styles from "./BestThirdLiveGraph.module.css";

type Props = {
  focusTeamIds: string[];
};

function deltaArrow(delta: number): string {
  if (delta > 0) return `↑${delta}`;
  if (delta < 0) return `↓${Math.abs(delta)}`;
  return "—";
}

function deltaClass(delta: number): string {
  if (delta > 0) return styles.deltaUp;
  if (delta < 0) return styles.deltaDown;
  return styles.deltaFlat;
}

export function BestThirdLiveGraph({ focusTeamIds }: Props) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const [expanded, setExpanded] = useState(false);

  const {
    snapshot,
    ranked,
    focusRows,
    cutoffCrossings,
    lastEventLabel,
    hasData,
    snapshots,
    presentIndex,
  } = useBestThirdLiveGraphState({ focusTeamIds });

  const bt = APP_COPY.bestThird;
  const tbl = APP_COPY.table;

  const cutoffBanner = useMemo(() => {
    if (cutoffCrossings.length === 0) return null;
    return cutoffCrossings
      .map((c) => {
        const name = teamDisplayName(teams[c.teamId], c.teamId);
        return c.direction === "in" ? bt.cutoffBannerIn(name) : bt.cutoffBannerOut(name);
      })
      .join(" · ");
  }, [cutoffCrossings, teams, bt]);

  if (!hasData || !snapshot || ranked.length === 0) return null;

  const compactRows = ranked.slice(0, expanded ? 12 : 8);

  return (
    <aside className={`${styles.panel} best-third-live-panel`} aria-label={bt.title}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{bt.title}</h2>
          <p className={styles.subtitle}>{bt.subtitle}</p>
        </div>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} aria-hidden />
          {bt.liveBadge}
        </span>
      </header>

      {cutoffBanner ? <div className={styles.cutoffBanner}>{cutoffBanner}</div> : null}

      {focusRows.length > 0 ? (
        <div className={styles.focusStrip}>
          {focusRows.map((row) => {
            const team = teams[row.teamId];
            return (
              <div key={row.teamId} className={styles.focusCard}>
                <div className={styles.focusRank}>#{row.rank}</div>
                <TeamFlag team={team} teamId={row.teamId} size="sm" />
                <div className={styles.focusMeta}>
                  <strong className="team-name-text">
                    {teamDisplayName(team, row.teamId)}
                  </strong>
                  <span className={styles.focusStats}>
                    {row.record.points} {tbl.points.toLowerCase()} · {tbl.goalDiff}{" "}
                    {row.record.goalDifference >= 0 ? "+" : ""}
                    {row.record.goalDifference} · {tbl.goalsFor}{" "}
                    {row.record.goalsFor}
                  </span>
                </div>
                <span className={`${styles.bubblePill} ${styles[`bubble--${row.bubbleState}`]}`}>
                  {row.bubbleLabel}
                </span>
                <span className={`${styles.focusDelta} ${deltaClass(row.positionDelta)}`}>
                  {deltaArrow(row.positionDelta)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className={styles.eventCallout}>{lastEventLabel}</p>

      <BestThirdTimelineChart
        snapshots={snapshots}
        sliderIndex={presentIndex}
        teams={teams}
        highlightedTeamId={focusTeamIds[0] ?? null}
        lockedTeamId={null}
        onHighlightTeam={() => {}}
        onLockTeam={() => {}}
        compact
        visibleSnapshotCount={8}
      />

      {!expanded ? (
        <ol className={styles.ladder} aria-label="Best third rankings">
          {compactRows.map((row, index) => {
            const rank = index + 1;
            const isFocus = focusTeamIds.includes(row.teamId);
            const delta = snapshot.deltas.find((d) => d.teamId === row.teamId);
            const posDelta = delta ? delta.positionBefore - delta.positionAfter : 0;
            const crossing = cutoffCrossings.find((c) => c.teamId === row.teamId);

            return (
              <li
                key={row.teamId}
                className={[
                  styles.ladderRow,
                  rank === 8 ? styles.ladderCut : "",
                  rank > 8 ? styles.ladderBelow : "",
                  isFocus ? styles.ladderFocus : "",
                  crossing?.direction === "in" ? styles.ladderCutoffIn : "",
                  crossing?.direction === "out" ? styles.ladderCutoffOut : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className={styles.ladderRank}>{rank}</span>
                <TeamFlag team={teams[row.teamId]} teamId={row.teamId} size="sm" />
                <span className={`${styles.ladderName} team-name-text`}>
                  {teamDisplayName(teams[row.teamId], row.teamId)}
                </span>
                <span className={styles.ladderPts}>
                  {row.points} {tbl.points.toLowerCase()}
                </span>
                <span className={styles.ladderGd}>
                  {tbl.goalDiff}{" "}
                  {row.goalDifference >= 0 ? "+" : ""}
                  {row.goalDifference}
                </span>
                <span className={`${styles.ladderDelta} ${deltaClass(posDelta)}`}>
                  {deltaArrow(posDelta)}
                </span>
              </li>
            );
          })}
          <li className={styles.ladderCutLabel} aria-hidden>
            {bt.cutoffLabel}
          </li>
        </ol>
      ) : (
        <BestThirdRankingTable
          snapshot={snapshot}
          teams={teams}
          standings={standings}
          focusTeamIds={focusTeamIds}
          cutoffCrossings={cutoffCrossings}
          showBubbleColumn
        />
      )}

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? bt.collapseTable : bt.expandTable}
        </button>
      </footer>
    </aside>
  );
}
