import type { ReactElement } from "react";
import { BRACKET_FEED_MAP } from "../../lib/bracketTree";
import styles from "./BracketConnectorOverlay.module.css";

type Props = {
  cardRects: Map<string, DOMRect>;
  containerRect: DOMRect;
  confirmedWinners: Set<string>;
  liveProvisionalFeeders?: Set<string>;
};

function pathClassName(
  feederId: string,
  confirmedWinners: Set<string>,
  liveProvisionalFeeders: Set<string>
): string {
  if (confirmedWinners.has(feederId)) return styles.pathConfirmed;
  if (liveProvisionalFeeders.has(feederId)) return styles.pathLiveProvisional;
  return styles.pathPending;
}

export function BracketConnectorOverlay({
  cardRects,
  containerRect,
  confirmedWinners,
  liveProvisionalFeeders = new Set(),
}: Props) {
  const paths: ReactElement[] = [];

  for (const [childId, feeders] of Object.entries(BRACKET_FEED_MAP)) {
    if (!feeders) continue;
    const childRect = cardRects.get(childId);
    if (!childRect) continue;

    const cx = childRect.left - containerRect.left;
    const cy = childRect.top - containerRect.top + childRect.height / 2;

    for (const feederId of feeders) {
      const feederRect = cardRects.get(feederId);
      if (!feederRect) continue;

      const fx = feederRect.right - containerRect.left;
      const fy = feederRect.top - containerRect.top + feederRect.height / 2;
      const mx = (fx + cx) / 2;

      paths.push(
        <path
          key={`${feederId}->${childId}`}
          className={pathClassName(feederId, confirmedWinners, liveProvisionalFeeders)}
          d={`M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${cy}, ${cx} ${cy}`}
          fill="none"
        />
      );
    }
  }

  if (paths.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className={styles.overlay}
      width={containerRect.width}
      height={containerRect.height}
    >
      {paths}
    </svg>
  );
}
