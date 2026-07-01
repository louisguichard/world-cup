import type { ReactElement } from "react";
import { BRACKET_FEED_MAP } from "../../lib/bracketTree";
import { isConnectorSegmentHighlighted } from "../../lib/brackets/bracketPathHighlight";
import styles from "./BracketConnectorOverlay.module.css";

type Props = {
  cardRects: Map<string, DOMRect>;
  containerSize: { width: number; height: number };
  confirmedWinners: Set<string>;
  liveProvisionalFeeders?: Set<string>;
  highlightedPath?: Set<string> | null;
};

function pathClassName(
  feederId: string,
  childId: string,
  confirmedWinners: Set<string>,
  liveProvisionalFeeders: Set<string>,
  highlightedPath: Set<string> | null | undefined
): string {
  const base = (() => {
    if (confirmedWinners.has(feederId)) return styles.pathConfirmed;
    if (liveProvisionalFeeders.has(feederId)) return styles.pathLiveProvisional;
    return styles.pathPending;
  })();

  if (!highlightedPath?.size) return base;

  return isConnectorSegmentHighlighted(feederId, childId, highlightedPath)
    ? `${base} ${styles.pathHighlighted}`
    : `${base} ${styles.pathDimmed}`;
}

function pairedPathClassName(
  feeders: [string, string],
  childId: string,
  confirmedWinners: Set<string>,
  liveProvisionalFeeders: Set<string>,
  highlightedPath: Set<string> | null | undefined
): string {
  const [a, b] = feeders;
  const base = (() => {
    if (confirmedWinners.has(a) && confirmedWinners.has(b)) return styles.pathConfirmed;
    if (liveProvisionalFeeders.has(a) || liveProvisionalFeeders.has(b)) {
      return styles.pathLiveProvisional;
    }
    return styles.pathPending;
  })();

  if (!highlightedPath?.size) return base;

  const stemHighlighted =
    isConnectorSegmentHighlighted(a, childId, highlightedPath) ||
    isConnectorSegmentHighlighted(b, childId, highlightedPath);

  return stemHighlighted ? `${base} ${styles.pathHighlighted}` : `${base} ${styles.pathDimmed}`;
}

export function BracketConnectorOverlay({
  cardRects,
  containerSize,
  confirmedWinners,
  liveProvisionalFeeders = new Set(),
  highlightedPath = null,
}: Props) {
  const paths: ReactElement[] = [];

  for (const [childId, feeders] of Object.entries(BRACKET_FEED_MAP)) {
    if (!feeders) continue;
    const childRect = cardRects.get(childId);
    const feeder1Rect = cardRects.get(feeders[0]);
    const feeder2Rect = cardRects.get(feeders[1]);
    if (!childRect || !feeder1Rect || !feeder2Rect) continue;

    const cx = childRect.left;
    const fy1 = feeder1Rect.top + feeder1Rect.height / 2;
    const fy2 = feeder2Rect.top + feeder2Rect.height / 2;
    const fMidY = (fy1 + fy2) / 2;
    const fx = feeder1Rect.right;
    const mx = fx + (cx - fx) * 0.5;

    if (cx - fx < 12) continue;

    const stemClass = pairedPathClassName(
      feeders,
      childId,
      confirmedWinners,
      liveProvisionalFeeders,
      highlightedPath
    );

    paths.push(
      <path
        key={`${feeders[0]}->${childId}-top`}
        className={pathClassName(feeders[0], childId, confirmedWinners, liveProvisionalFeeders, highlightedPath)}
        d={`M ${fx} ${fy1} H ${mx} V ${fMidY}`}
        fill="none"
      />,
      <path
        key={`${feeders[1]}->${childId}-bot`}
        className={pathClassName(feeders[1], childId, confirmedWinners, liveProvisionalFeeders, highlightedPath)}
        d={`M ${fx} ${fy2} H ${mx} V ${fMidY}`}
        fill="none"
      />,
      <path
        key={`${childId}-stem`}
        className={stemClass}
        d={`M ${mx} ${fMidY} H ${cx}`}
        fill="none"
      />
    );
  }

  if (paths.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className={`${styles.overlay} bracket-connector-overlay`}
      style={{ pointerEvents: "none" }}
      width={containerSize.width}
      height={containerSize.height}
    >
      {paths}
    </svg>
  );
}
