import type { MatchEvent, Team } from "../../types";
import type { PlayerPhotoSize } from "../player/PlayerPhoto";
import { PlayerPhoto } from "../player/PlayerPhoto";
import { useEventPlayerPhotos } from "../../hooks/useEventPlayerPhotos";

type Props = {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeam?: Team;
  awayTeam?: Team;
  photoSize?: PlayerPhotoSize;
};

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "own_goal"]);
const CARD_TYPES = new Set<MatchEvent["type"]>(["yellow_card", "red_card", "yellow_red_card"]);
const SUB_TYPES = new Set<MatchEvent["type"]>(["substitution"]);
const OTHER_TYPES = new Set<MatchEvent["type"]>([
  "var_review",
  "goal_disallowed",
  "penalty_missed",
  "penalty_saved",
]);

const DISPLAY_TYPES = new Set<MatchEvent["type"]>([
  ...GOAL_TYPES,
  ...CARD_TYPES,
  ...SUB_TYPES,
  ...OTHER_TYPES,
]);

function formatGoal(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  const suffix = e.type === "own_goal" ? " (OG)" : "";
  const assist = e.assistName ? ` (${e.assistName})` : "";
  return `${e.playerName}${assist} ${e.minute}${extra}'${suffix}`;
}

function formatCard(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  const label = e.type === "yellow_card" ? "YC" : e.type === "red_card" ? "RC" : "Y/R";
  return `${label} ${e.playerName} ${e.minute}${extra}'`;
}

function formatSubstitution(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  const out = e.assistName ? ` ↓ ${e.assistName}` : "";
  return `↑ ${e.playerName}${out} ${e.minute}${extra}'`;
}

function formatOther(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  switch (e.type) {
    case "var_review":
      return `VAR ${e.playerName} ${e.minute}${extra}'`;
    case "goal_disallowed":
      return `No goal ${e.playerName} ${e.minute}${extra}'`;
    case "penalty_missed":
      return `Pen. miss ${e.playerName} ${e.minute}${extra}'`;
    case "penalty_saved":
      return `Pen. save ${e.playerName} ${e.minute}${extra}'`;
    default:
      return `${e.type} ${e.minute}${extra}'`;
  }
}

function formatEvent(e: MatchEvent): string {
  if (GOAL_TYPES.has(e.type)) return formatGoal(e);
  if (CARD_TYPES.has(e.type)) return formatCard(e);
  if (SUB_TYPES.has(e.type)) return formatSubstitution(e);
  return formatOther(e);
}

type EventRowProps = {
  event: MatchEvent;
  label: string;
  isCard?: boolean;
  isSub?: boolean;
  isAway?: boolean;
  photoUrl?: string;
  photoSize: PlayerPhotoSize;
};

function EventRow({ event, label, isCard, isSub, isAway, photoUrl, photoSize }: EventRowProps) {
  return (
    <span
      className={`match-goal-scorers-item${isCard ? " match-goal-scorers-item--card" : ""}${isSub ? " match-goal-scorers-item--sub" : ""}${isAway ? " match-goal-scorers-item--away" : ""}`}
    >
      <PlayerPhoto name={event.playerName} photoUrl={photoUrl} size={photoSize} />
      <span className="match-goal-scorers-item-text">{label}</span>
    </span>
  );
}

function eventsForSide(
  events: MatchEvent[],
  teamId: string,
  types: Set<MatchEvent["type"]>
): MatchEvent[] {
  return events.filter((e) => types.has(e.type) && e.teamId === teamId);
}

/** Compact goals, cards, subs, and key incidents for live cards and result rows. */
export function MatchGoalScorers({
  events,
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  photoSize = "sm",
}: Props) {
  const displayEvents = events.filter((e) => DISPLAY_TYPES.has(e.type));
  const photos = useEventPlayerPhotos({ events: displayEvents, homeTeam, awayTeam });

  const homeEvents = [
    ...eventsForSide(displayEvents, homeTeamId, GOAL_TYPES),
    ...eventsForSide(displayEvents, homeTeamId, CARD_TYPES),
    ...eventsForSide(displayEvents, homeTeamId, SUB_TYPES),
    ...eventsForSide(displayEvents, homeTeamId, OTHER_TYPES),
  ];
  const awayEvents = [
    ...eventsForSide(displayEvents, awayTeamId, GOAL_TYPES),
    ...eventsForSide(displayEvents, awayTeamId, CARD_TYPES),
    ...eventsForSide(displayEvents, awayTeamId, SUB_TYPES),
    ...eventsForSide(displayEvents, awayTeamId, OTHER_TYPES),
  ];

  if (homeEvents.length === 0 && awayEvents.length === 0) {
    return null;
  }

  return (
    <div className="match-goal-scorers" aria-label="Match events">
      <div className="match-goal-scorers-col">
        {homeEvents.map((e) => (
          <EventRow
            key={e.providerId}
            event={e}
            label={formatEvent(e)}
            isCard={CARD_TYPES.has(e.type)}
            isSub={SUB_TYPES.has(e.type)}
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
      </div>
      <div className="match-goal-scorers-col match-goal-scorers-col--away">
        {awayEvents.map((e) => (
          <EventRow
            key={e.providerId}
            event={e}
            label={formatEvent(e)}
            isCard={CARD_TYPES.has(e.type)}
            isSub={SUB_TYPES.has(e.type)}
            isAway
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
      </div>
    </div>
  );
}

export function hasDisplayableMatchEvents(events: MatchEvent[]): boolean {
  return events.some((e) => DISPLAY_TYPES.has(e.type));
}
