import type { MatchEvent } from "../../../../types";

type Props = {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
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
  penalty_saved: "🧤"
};

function eventLabel(event: MatchEvent): string {
  switch (event.type) {
    case "goal": return `${event.playerName}${event.assistName ? ` (${event.assistName})` : ""}`;
    case "own_goal": return `${event.playerName} (OG)`;
    case "yellow_card": return `${event.playerName} (YC)`;
    case "red_card": return `${event.playerName} (RC)`;
    case "yellow_red_card": return `${event.playerName} (2Y)`;
    case "substitution": return `↑ ${event.playerName}${event.assistName ? ` ↓ ${event.assistName}` : ""}`;
    case "var_review": return `VAR: ${event.playerName} — ${event.varOutcome ?? "review"}`;
    case "goal_disallowed": return `${event.playerName} (Disallowed)`;
    case "penalty_missed": return `${event.playerName} (Pen. missed)`;
    case "penalty_saved": return `${event.playerName} (Pen. saved)`;
    default: {
      const _never: never = event.type;
      return String(_never);
    }
  }
}

export function MatchEventTimeline({
  events,
  homeTeamId,
  homeTeamName,
  awayTeamName
}: Props) {
  return (
    <div style={{ padding: "0 0 16px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 16px 12px",
          fontSize: 11,
          color: "var(--ss-muted)",
          fontWeight: 600
        }}
      >
        <span>{homeTeamName}</span>
        <span>{awayTeamName}</span>
      </div>

      {/* Spine */}
      {events.map((event, i) => {
        const isHome = event.teamId === homeTeamId;
        const minuteLabel = event.minuteExtra
          ? `${event.minute}+${event.minuteExtra}'`
          : `${event.minute}'`;

        return (
          <div
            key={event.providerId}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              gap: 12,
              animation: `fadeSlideIn 0.25s ease both`,
              animationDelay: `${i * 50}ms`,
              animationFillMode: "both"
            }}
          >
            {/* Home side */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "flex-end",
                textAlign: "right",
                opacity: isHome ? 1 : 0,
                pointerEvents: isHome ? "auto" : "none"
              }}
            >
              {isHome ? (
                <span style={{ fontSize: 13, color: "var(--ss-text)" }}>
                  {eventLabel(event)}
                </span>
              ) : null}
            </div>

            {/* Center spine */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minWidth: 48
              }}
            >
              <span style={{ fontSize: 16 }}>{EVENT_ICON[event.type]}</span>
              <span style={{ fontSize: 10, color: "var(--ss-brand)", fontWeight: 600 }}>
                {minuteLabel}
              </span>
            </div>

            {/* Away side */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "flex-start",
                opacity: !isHome ? 1 : 0,
                pointerEvents: !isHome ? "auto" : "none"
              }}
            >
              {!isHome ? (
                <span style={{ fontSize: 13, color: "var(--ss-text)" }}>
                  {eventLabel(event)}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
