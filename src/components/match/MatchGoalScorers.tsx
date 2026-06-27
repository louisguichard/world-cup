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

function formatGoal(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  const suffix = e.type === "own_goal" ? " (OG)" : "";
  return `${e.playerName} ${e.minute}${extra}'${suffix}`;
}

function formatCard(e: MatchEvent) {
  const extra = e.minuteExtra ? `+${e.minuteExtra}` : "";
  const label = e.type === "yellow_card" ? "YC" : e.type === "red_card" ? "RC" : "Y/R";
  return `${label} ${e.playerName} ${e.minute}${extra}'`;
}

type ScorerRowProps = {
  event: MatchEvent;
  label: string;
  isCard?: boolean;
  isAway?: boolean;
  photoUrl?: string;
  photoSize: PlayerPhotoSize;
};

function ScorerRow({ event, label, isCard, isAway, photoUrl, photoSize }: ScorerRowProps) {
  return (
    <span
      className={`match-goal-scorers-item${isCard ? " match-goal-scorers-item--card" : ""}${isAway ? " match-goal-scorers-item--away" : ""}`}
    >
      <PlayerPhoto name={event.playerName} photoUrl={photoUrl} size={photoSize} />
      <span className="match-goal-scorers-item-text">{label}</span>
    </span>
  );
}

/** Compact goal scorers and cards for live cards and result rows. */
export function MatchGoalScorers({
  events,
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  photoSize = "sm",
}: Props) {
  const photos = useEventPlayerPhotos({ events, homeTeam, awayTeam });

  const homeGoals = events.filter((e) => GOAL_TYPES.has(e.type) && e.teamId === homeTeamId);
  const awayGoals = events.filter((e) => GOAL_TYPES.has(e.type) && e.teamId === awayTeamId);
  const homeCards = events.filter((e) => CARD_TYPES.has(e.type) && e.teamId === homeTeamId);
  const awayCards = events.filter((e) => CARD_TYPES.has(e.type) && e.teamId === awayTeamId);

  if (homeGoals.length === 0 && awayGoals.length === 0 && homeCards.length === 0 && awayCards.length === 0) {
    return null;
  }

  return (
    <div className="match-goal-scorers" aria-label="Goals and cards">
      <div className="match-goal-scorers-col">
        {homeGoals.map((e) => (
          <ScorerRow
            key={e.providerId}
            event={e}
            label={formatGoal(e)}
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
        {homeCards.map((e) => (
          <ScorerRow
            key={e.providerId}
            event={e}
            label={formatCard(e)}
            isCard
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
      </div>
      <div className="match-goal-scorers-col match-goal-scorers-col--away">
        {awayGoals.map((e) => (
          <ScorerRow
            key={e.providerId}
            event={e}
            label={formatGoal(e)}
            isAway
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
        {awayCards.map((e) => (
          <ScorerRow
            key={e.providerId}
            event={e}
            label={formatCard(e)}
            isCard
            isAway
            photoUrl={photos[e.providerId]}
            photoSize={photoSize}
          />
        ))}
      </div>
    </div>
  );
}
