import { useMemo } from "react";
import type { QualificationMatchContext } from "../../lib/qualification";
import {
  buildSplitBracketConnectors,
  buildSplitBracketLayout,
  SPLIT_BRACKET_METRICS,
  type SplitBracketLayout,
} from "../../lib/brackets/buildSplitBracketLayout";
import { isConnectorSegmentHighlighted } from "../../lib/brackets/bracketPathHighlight";
import { BRACKET_STAGE_SHORT_LABELS } from "../../lib/brackets/bracketStageLabels";
import { APP_COPY } from "../../lib/appCopy";
import { useBracketPanZoom } from "../../hooks/useBracketPanZoom";
import type { BracketMatch, GroupStanding, MergedMatch, Team } from "../../types";
import connectorStyles from "../bentos/BracketConnectorOverlay.module.css";
import { BracketCard } from "./BracketCard";
import { BracketPanZoomControls } from "./BracketPanZoomControls";

type Props = {
  visibleMatchIds: Set<string>;
  matchesById: Map<string, BracketMatch>;
  teamsById: Record<string, Team>;
  mode: "confirmed" | "projected";
  standings: GroupStanding[];
  liveMatches: Record<string, MergedMatch>;
  qualContext: QualificationMatchContext;
  confirmedWinners: Set<string>;
  liveProvisionalFeeders: Set<string>;
  pathHighlight: Set<string> | null;
  showPathHighlight: boolean;
  onTeamSelect: (teamId: string) => void;
  onMatchSelect: (matchId: string) => void;
  onTeamPathHoverStart: (matchId: string) => void;
  onTeamPathHoverEnd: () => void;
};

function connectorClassName(
  feederId: string,
  childId: string,
  confirmedWinners: Set<string>,
  liveProvisionalFeeders: Set<string>,
  pathHighlight: Set<string> | null
): string {
  const base = (() => {
    if (confirmedWinners.has(feederId)) return connectorStyles.pathConfirmed;
    if (liveProvisionalFeeders.has(feederId)) return connectorStyles.pathLiveProvisional;
    return connectorStyles.pathPending;
  })();

  if (!pathHighlight?.size) return base;

  return isConnectorSegmentHighlighted(feederId, childId, pathHighlight)
    ? `${base} ${connectorStyles.pathHighlighted}`
    : `${base} ${connectorStyles.pathDimmed}`;
}

function renderConnectors(
  layout: SplitBracketLayout,
  visibleMatchIds: Set<string>,
  confirmedWinners: Set<string>,
  liveProvisionalFeeders: Set<string>,
  pathHighlight: Set<string> | null
) {
  const segments = buildSplitBracketConnectors(layout, visibleMatchIds);
  return segments.map((segment, index) => (
    <path
      key={`${segment.feederId}-${segment.childId}-${index}`}
      className={connectorClassName(
        segment.feederId,
        segment.childId,
        confirmedWinners,
        liveProvisionalFeeders,
        pathHighlight
      )}
      d={segment.d}
      fill="none"
    />
  ));
}

export function SplitBracketCanvas({
  visibleMatchIds,
  matchesById,
  teamsById,
  mode,
  standings,
  liveMatches,
  qualContext,
  confirmedWinners,
  liveProvisionalFeeders,
  pathHighlight,
  showPathHighlight,
  onTeamSelect,
  onMatchSelect,
  onTeamPathHoverStart,
  onTeamPathHoverEnd,
}: Props) {
  const layout = useMemo(
    () => buildSplitBracketLayout(visibleMatchIds, BRACKET_STAGE_SHORT_LABELS),
    [visibleMatchIds]
  );

  const panZoom = useBracketPanZoom({
    contentWidth: layout?.width ?? 0,
    contentHeight: layout?.height ?? 0,
    enabled: Boolean(layout),
  });

  if (!layout) return null;

  const sortedNodes = [...layout.nodes.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const copy = APP_COPY.bracket;

  return (
    <div className="split-bracket-shell">
      <div className="split-bracket-toolbar">
        <p className="bracket-scroll-hint split-bracket-pan-hint">{copy.panZoomHint}</p>
        <BracketPanZoomControls
          onZoomIn={panZoom.zoomIn}
          onZoomOut={panZoom.zoomOut}
          onReset={panZoom.fitToView}
        />
      </div>

      <div
        ref={panZoom.viewportRef}
        className={`split-bracket-viewport${panZoom.isPanning ? " is-panning" : ""}`}
        onPointerDown={panZoom.onPointerDown}
        onPointerMove={panZoom.onPointerMove}
        onPointerUp={panZoom.onPointerUp}
        onPointerCancel={panZoom.onPointerCancel}
      >
        <div
          className="split-bracket-transform"
          style={{
            width: layout.width,
            height: layout.height,
            transform: panZoom.transformCss,
          }}
        >
          <div
            className="split-bracket-canvas"
            style={{ width: layout.width, height: layout.height }}
          >
            <div className="split-bracket-headers" aria-hidden="true">
              {layout.columnLabels.map((column) => (
                <span
                  key={`${column.half}:${column.stage}:${column.x}`}
                  className="split-bracket-header"
                  style={{ left: column.x, width: SPLIT_BRACKET_METRICS.cardWidth }}
                >
                  {column.label}
                </span>
              ))}
            </div>

            <svg
              aria-hidden="true"
              className="split-bracket-connectors"
              width={layout.width}
              height={layout.height}
            >
              {renderConnectors(
                layout,
                visibleMatchIds,
                confirmedWinners,
                liveProvisionalFeeders,
                showPathHighlight ? pathHighlight : null
              )}
            </svg>

            {sortedNodes.map((node) => {
              const match = matchesById.get(node.matchId);
              if (!match) return null;

              return (
                <div
                  key={node.matchId}
                  className="split-bracket-node"
                  data-match-id={node.matchId}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                  }}
                >
                  <BracketCard
                    match={match}
                    teamsById={teamsById}
                    mode={mode}
                    variant="tree"
                    standings={standings}
                    liveMatches={liveMatches}
                    qualContext={qualContext}
                    onTeamSelect={onTeamSelect}
                    onMatchSelect={onMatchSelect}
                    pathHighlighted={showPathHighlight && Boolean(pathHighlight?.has(node.matchId))}
                    pathDimmed={showPathHighlight && !pathHighlight?.has(node.matchId)}
                    onTeamPathHoverStart={onTeamPathHoverStart}
                    onTeamPathHoverEnd={onTeamPathHoverEnd}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
