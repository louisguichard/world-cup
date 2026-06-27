/** SVG ranking chart for the best-third timeline slider. */
import { useMemo, useRef, useState, useEffect } from "react";
import type { RankingSnapshot } from "../../lib/buildRankingTimeline";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import type { Team } from "../../types";
import {
  CHART_HEIGHT,
  CHART_PAD_BOTTOM,
  CHART_PAD_LEFT,
  CHART_PAD_RIGHT,
  CHART_PAD_TOP,
  CUT_LINE_RANK,
  TIMELINE_CHART_COLORS,
} from "./bestThirdTimelineConstants";
import styles from "./BestThirdTimeline.module.css";

type Props = {
  snapshots: RankingSnapshot[];
  sliderIndex: number;
  teams: Record<string, Team>;
  highlightedTeamId: string | null;
  lockedTeamId: string | null;
  onHighlightTeam: (teamId: string | null) => void;
  onLockTeam: (teamId: string | null) => void;
  compact?: boolean;
  visibleSnapshotCount?: number;
};

function rankAtSnapshot(teamId: string, snapshot: RankingSnapshot): number {
  const index = snapshot.rankings.findIndex((row) => row.teamId === teamId);
  return index >= 0 ? index + 1 : snapshot.rankings.length + 1;
}

export function BestThirdTimelineChart({
  snapshots,
  sliderIndex,
  teams,
  highlightedTeamId,
  lockedTeamId,
  onHighlightTeam,
  onLockTeam,
  compact = false,
  visibleSnapshotCount,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(compact ? 320 : 600);

  const visibleSnapshots = useMemo(() => {
    if (!visibleSnapshotCount || visibleSnapshotCount >= snapshots.length) {
      return snapshots;
    }
    const start = Math.max(0, snapshots.length - visibleSnapshotCount);
    return snapshots.slice(start);
  }, [snapshots, visibleSnapshotCount]);

  const visibleSliderIndex = useMemo(() => {
    if (visibleSnapshots === snapshots) return sliderIndex;
    const offset = snapshots.length - visibleSnapshots.length;
    return Math.max(0, sliderIndex - offset);
  }, [snapshots, visibleSnapshots, sliderIndex]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next && next > 0) setWidth(Math.max(500, next));
    });

    observer.observe(node);
    const minW = compact ? 280 : 500;
    setWidth(Math.max(minW, node.clientWidth || (compact ? 320 : 600)));
    return () => observer.disconnect();
  }, [compact]);

  const chartTeams = useMemo(() => {
    const seed = visibleSnapshots.find((snapshot) => snapshot.rankings.length > 0)?.rankings ?? [];
    return seed.slice(0, 12).map((row, index) => ({
      teamId: row.teamId,
      color: TIMELINE_CHART_COLORS[index % TIMELINE_CHART_COLORS.length],
    }));
  }, [visibleSnapshots]);

  const chartHeight = compact ? 140 : CHART_HEIGHT;
  const padLeft = compact ? 72 : CHART_PAD_LEFT;
  const padRight = compact ? 40 : CHART_PAD_RIGHT;
  const padTop = compact ? 12 : CHART_PAD_TOP;
  const padBottom = compact ? 12 : CHART_PAD_BOTTOM;

  const maxRank = Math.max(12, ...visibleSnapshots.map((s) => s.rankings.length));
  const plotWidth = width - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;
  const xStep = visibleSnapshots.length > 1 ? plotWidth / (visibleSnapshots.length - 1) : plotWidth;

  const xForIndex = (index: number): number => padLeft + index * xStep;
  const yForRank = (rank: number): number =>
    padTop + ((rank - 1) / Math.max(1, maxRank - 1)) * plotHeight;

  const activeHighlight = lockedTeamId ?? highlightedTeamId;

  return (
    <div ref={containerRef} className={styles.chartArea}>
      <svg
        className={styles.chart}
        width={width}
        height={chartHeight}
        role="img"
        aria-label="Best third ranking positions over time"
      >
        <line
          x1={padLeft}
          y1={yForRank(CUT_LINE_RANK)}
          x2={width - padRight}
          y2={yForRank(CUT_LINE_RANK)}
          className={styles.svgCutLine}
        />
        {!compact ? (
          <text
            x={width - padRight + 6}
            y={yForRank(CUT_LINE_RANK) + 4}
            fill="var(--warn)"
            fontSize={10}
            fontWeight={700}
          >
            CUT
          </text>
        ) : null}

        {chartTeams.map(({ teamId, color }) => {
          const points = visibleSnapshots
            .map((snapshot, index) => {
              const rank = rankAtSnapshot(teamId, snapshot);
              return `${xForIndex(index)},${yForRank(rank)}`;
            })
            .join(" ");

          const dimmed = activeHighlight !== null && activeHighlight !== teamId;
          const currentRank = rankAtSnapshot(teamId, visibleSnapshots[visibleSliderIndex]!);

          return (
            <g key={teamId}>
              <polyline
                points={points}
                className={styles.svgTeamLine}
                stroke={color}
                strokeWidth={activeHighlight === teamId ? 2.5 : compact ? 1.2 : 1.5}
                opacity={dimmed ? 0.2 : 1}
                onMouseEnter={compact ? undefined : () => onHighlightTeam(teamId)}
                onMouseLeave={compact ? undefined : () => onHighlightTeam(null)}
                onClick={
                  compact ? undefined : () => onLockTeam(lockedTeamId === teamId ? null : teamId)
                }
                style={compact ? { pointerEvents: "none" } : undefined}
              />
              {!compact ? (
                <>
                  <text
                    x={8}
                    y={yForRank(currentRank) + 4}
                    fill="var(--text)"
                    fontSize={11}
                    opacity={dimmed ? 0.35 : 0.95}
                  >
                    {teamDisplayNameFromId(teamId, teams)}
                  </text>
                  <text
                    x={width - padRight + 6}
                    y={yForRank(currentRank) + 4}
                    fill={color}
                    fontSize={11}
                    fontWeight={700}
                    opacity={dimmed ? 0.35 : 1}
                  >
                    #{currentRank}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {visibleSnapshots.map((snapshot, index) => {
          if (snapshot.type === "final-whistle") {
            return (
              <line
                key={`ft-${snapshot.id}`}
                x1={xForIndex(index)}
                y1={padTop}
                x2={xForIndex(index)}
                y2={chartHeight - padBottom}
                stroke="var(--line-2)"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            );
          }

          if (snapshot.type !== "goal" || !snapshot.scoringTeamId) return null;
          const teamColor =
            chartTeams.find((entry) => entry.teamId === snapshot.scoringTeamId)?.color ?? "var(--accent)";
          const rank = rankAtSnapshot(snapshot.scoringTeamId, snapshot);

          return (
            <circle
              key={`dot-${snapshot.id}`}
              cx={xForIndex(index)}
              cy={yForRank(rank)}
              r={compact ? 3 : 5}
              fill={teamColor}
              className={styles.svgGoalDot}
            />
          );
        })}

        {!compact ? (
          <line
            x1={xForIndex(visibleSliderIndex)}
            y1={padTop}
            x2={xForIndex(visibleSliderIndex)}
            y2={chartHeight - padBottom}
            className={styles.svgCurrentLine}
          />
        ) : null}
      </svg>
    </div>
  );
}
