import type { MatchEvent } from "../../types";

type Props = {
  events: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
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

/** Compact goal scorers and cards for live cards and result rows. */
export function MatchGoalScorers({ events, homeTeamId, awayTeamId }: Props) {
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
          <span key={e.providerId} className="match-goal-scorers-item">
            {formatGoal(e)}
          </span>
        ))}
        {homeCards.map((e) => (
          <span key={e.providerId} className="match-goal-scorers-item match-goal-scorers-item--card">
            {formatCard(e)}
          </span>
        ))}
      </div>
      <div className="match-goal-scorers-col match-goal-scorers-col--away">
        {awayGoals.map((e) => (
          <span key={e.providerId} className="match-goal-scorers-item">
            {formatGoal(e)}
          </span>
        ))}
        {awayCards.map((e) => (
          <span key={e.providerId} className="match-goal-scorers-item match-goal-scorers-item--card">
            {formatCard(e)}
          </span>
        ))}
      </div>
    </div>
  );
}
