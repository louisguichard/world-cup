import type { MatchEvent } from "../types";

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "own_goal"]);
const CARD_TYPES = new Set<MatchEvent["type"]>(["yellow_card", "red_card", "yellow_red_card"]);
const SUB_TYPES = new Set<MatchEvent["type"]>(["substitution"]);
const OTHER_TYPES = new Set<MatchEvent["type"]>([
  "var_review",
  "goal_disallowed",
  "penalty_missed",
  "penalty_saved",
]);

/** Event types shown in compact match cards (goals, cards, subs, key incidents). */
export const MATCH_DISPLAY_EVENT_TYPES = new Set<MatchEvent["type"]>([
  ...GOAL_TYPES,
  ...CARD_TYPES,
  ...SUB_TYPES,
  ...OTHER_TYPES,
]);

export function hasDisplayableMatchEvents(events: MatchEvent[]): boolean {
  return events.some((e) => MATCH_DISPLAY_EVENT_TYPES.has(e.type));
}
