import type { ReactElement } from "react";
import { BRACKET_FEED_MAP } from "../../lib/bracketTree";
import styles from "./BracketConnectorOverlay.module.css";

type Props = {
  cardRects: Map<string, DOMRect>;
  containerSize: { width: number; height: number };
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
  containerSize,
  confirmedWinners,
  liveProvisionalFeeders = new Set(),
}: Props) {
  const paths: ReactElement[] = [];

  for (const [childId, feeders] of Object.entries(BRACKET_FEED_MAP)) {
    if (!feeders) continue;
    const childRect = cardRects.get(childId);
    if (!childRect) continue;

    const cx = childRect.left;
    const cy = childRect.top + childRect.height / 2;

    for (const feederId of feeders) {
      const feederRect = cardRects.get(feederId);
      if (!feederRect) continue;

      const fx = feederRect.right;
      const fy = feederRect.top + feederRect.height / 2;

      if (cx - fx < 12) continue;

      const mx = fx + (cx - fx) * 0.5;

      paths.push(
        <path
          key={`${feederId}->${childId}`}
          className={pathClassName(feederId, confirmedWinners, liveProvisionalFeeders)}
          d={`M ${fx} ${fy} H ${mx} V ${cy} H ${cx}`}
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
      width={containerSize.width}
      height={containerSize.height}
    >
      {paths}
    </svg>
  );
}
