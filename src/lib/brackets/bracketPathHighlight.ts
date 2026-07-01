import { BRACKET_FEED_MAP, findChildBracketMatchId } from "../bracketTree";

/** Match ids from this slot forward toward the Final (inclusive). */
export function collectForwardPathFromMatch(startMatchId: string): Set<string> {
  const path = new Set<string>([startMatchId]);
  let current = startMatchId;

  while (true) {
    const child = findChildBracketMatchId(current);
    if (!child || path.has(child)) break;
    path.add(child);
    current = child;
  }

  return path;
}

/** Match ids feeding into this slot (inclusive), walking upstream through the bracket graph. */
export function collectFeederAncestors(matchId: string): Set<string> {
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const feeders = BRACKET_FEED_MAP[id];
    if (!feeders) return;
    for (const feeder of feeders) {
      visit(feeder);
    }
  };

  visit(matchId);
  return visited;
}

/** Full highlight path for a tree card — upstream feeders plus downstream route to the Final. */
export function collectBracketPathForMatch(matchId: string): Set<string> {
  const path = collectForwardPathFromMatch(matchId);
  for (const id of collectFeederAncestors(matchId)) {
    path.add(id);
  }
  return path;
}

/** True when a connector path segment should highlight for the active bracket path. */
export function isConnectorSegmentHighlighted(
  feederId: string,
  childId: string,
  highlightedPath: Set<string> | null | undefined
): boolean {
  if (!highlightedPath?.size) return false;
  return highlightedPath.has(feederId) && highlightedPath.has(childId);
}
