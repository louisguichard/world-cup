import type { ReactNode } from "react";
import type { MatchEvent, Team } from "../../../../types";
import { PlayerPhoto } from "../../../../components/player/PlayerPhoto";
import { useEventPlayerPhotos } from "../../../../hooks/useEventPlayerPhotos";
import { assistPhotoKey } from "../../../../services/playerProfile/resolveEventPlayerPhotos";
import styles from "./MatchEventTimeline.module.css";

type Props = {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeam?: Team;
  awayTeam?: Team;
};

const EVENT_ICON: Record<import("../../../../types").MatchEventType, string> = {
  goal: "⚽",
  own_goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  yellow_red_card: "🟨🟥",
  substitution: "🔄",
  var_review: "📺",
  goal_disallowed: "⚽",
  penalty_missed: "🎯",
  penalty_saved: "🧤",
};

const PLAYER_EVENT_TYPES = new Set<MatchEvent["type"]>([
  "goal",
  "own_goal",
  "yellow_card",
  "red_card",
  "yellow_red_card",
  "substitution",
  "penalty_missed",
  "penalty_saved",
]);

function eventLabel(event: MatchEvent, assistPhotoUrl?: string): ReactNode {
  switch (event.type) {
    case "goal":
      return (
        <>
          {event.playerName}
          {event.assistName ? (
            <>
              {" ("}
              <PlayerPhoto name={event.assistName} photoUrl={assistPhotoUrl} size="xs" />
              {event.assistName}
              {")"}
            </>
          ) : null}
        </>
      );
    case "own_goal":
      return `${event.playerName} (OG)`;
    case "yellow_card":
      return `${event.playerName} (YC)`;
    case "red_card":
      return `${event.playerName} (RC)`;
    case "yellow_red_card":
      return `${event.playerName} (2Y)`;
    case "substitution":
      return `↑ ${event.playerName}${event.assistName ? ` ↓ ${event.assistName}` : ""}`;
    case "var_review":
      return `VAR: ${event.playerName} — ${event.varOutcome ?? "review"}`;
    case "goal_disallowed":
      return `${event.playerName} (Disallowed)`;
    case "penalty_missed":
      return `${event.playerName} (Pen. missed)`;
    case "penalty_saved":
      return `${event.playerName} (Pen. saved)`;
    default: {
      const _never: never = event.type;
      return String(_never);
    }
  }
}

function EventRow({
  event,
  isHome,
  photoUrl,
  assistPhotoUrl,
  index,
}: {
  event: MatchEvent;
  isHome: boolean;
  photoUrl?: string;
  assistPhotoUrl?: string;
  index: number;
}) {
  const minuteLabel = event.minuteExtra
    ? `${event.minute}+${event.minuteExtra}'`
    : `${event.minute}'`;
  const showPhoto = PLAYER_EVENT_TYPES.has(event.type);

  const label = (
    <span className={styles.eventLabel}>
      {showPhoto ? (
        <PlayerPhoto name={event.playerName} photoUrl={photoUrl} size="sm" />
      ) : null}
      {eventLabel(event, assistPhotoUrl)}
    </span>
  );

  return (
    <div
      className={styles.row}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`${styles.side} ${styles.sideHome}${isHome ? "" : ` ${styles.sideHidden}`}`}>
        {isHome ? label : null}
      </div>
      <div className={styles.spine}>
        <span className={styles.icon}>{EVENT_ICON[event.type]}</span>
        <span className={styles.minute}>{minuteLabel}</span>
      </div>
      <div className={`${styles.side} ${styles.sideAway}${!isHome ? "" : ` ${styles.sideHidden}`}`}>
        {!isHome ? label : null}
      </div>
    </div>
  );
}

export function MatchEventTimeline({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName,
  homeTeam,
  awayTeam,
}: Props) {
  const photos = useEventPlayerPhotos({ events, homeTeam, awayTeam });

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>{homeTeamName}</span>
        <span>{awayTeamName}</span>
      </div>
      {events.map((event, i) => (
        <EventRow
          key={event.providerId}
          event={event}
          isHome={event.teamId === homeTeamId}
          photoUrl={photos[event.providerId]}
          assistPhotoUrl={photos[assistPhotoKey(event.providerId)]}
          index={i}
        />
      ))}
    </div>
  );
}
