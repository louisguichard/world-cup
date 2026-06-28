import type { MatchEvent, MergedMatch, Team } from "../../types";
import type { AiSportsHighlightsRequest } from "../../types/aiSportsHighlights";
import { teamDisplayName } from "../../lib/teamIdentity";
import { AI_HIGHLIGHTS_DEFAULT_LANGUAGE } from "../../config/aiSportsHighlightsEndpoints";

function formatMinute(event: MatchEvent): string {
  return event.minuteExtra ? `${event.minute}+${event.minuteExtra}'` : `${event.minute}'`;
}

function describeEvent(event: MatchEvent, homeTeamId: string, homeName: string, awayName: string): string {
  const side = event.teamId === homeTeamId ? homeName : awayName;
  const player = event.playerName || "Unknown player";
  switch (event.type) {
    case "goal":
      return `${formatMinute(event)} goal by ${player} (${side})${event.assistName ? `, assist ${event.assistName}` : ""}`;
    case "own_goal":
      return `${formatMinute(event)} own goal by ${player} (${side})`;
    case "penalty_missed":
      return `${formatMinute(event)} penalty missed by ${player} (${side})`;
    case "penalty_saved":
      return `${formatMinute(event)} penalty saved against ${player} (${side})`;
    case "red_card":
      return `${formatMinute(event)} red card for ${player} (${side})`;
    case "yellow_card":
      return `${formatMinute(event)} yellow card for ${player} (${side})`;
    case "yellow_red_card":
      return `${formatMinute(event)} second yellow for ${player} (${side})`;
    case "substitution":
      return `${formatMinute(event)} substitution for ${side}: ${player}`;
    case "var_review":
      return `${formatMinute(event)} VAR review involving ${player} (${side})`;
    case "goal_disallowed":
      return `${formatMinute(event)} goal disallowed for ${player} (${side})`;
    default: {
      const exhaustive: never = event.type;
      return `${formatMinute(event)} ${exhaustive} — ${player} (${side})`;
    }
  }
}

function competitionLabel(match: MergedMatch): string {
  if (match.group) return `FIFA World Cup 2026 Group ${match.group}`;
  if (match.stage) return `FIFA World Cup 2026 ${match.stage}`;
  return "FIFA World Cup 2026";
}

function scoreLabel(match: MergedMatch): string {
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  return `${home}-${away}`;
}

/** Build AI highlights POST body from a completed fixture. */
export function buildAiHighlightRequest(input: {
  match: MergedMatch;
  homeTeam?: Team;
  awayTeam?: Team;
  events?: MatchEvent[];
  language?: string;
}): AiSportsHighlightsRequest {
  const { match, homeTeam, awayTeam, events = [], language = AI_HIGHLIGHTS_DEFAULT_LANGUAGE } = input;
  const homeName = teamDisplayName(homeTeam, match.homeTeamId);
  const awayName = teamDisplayName(awayTeam, match.awayTeamId);

  const keyEvents = events
    .filter((e) => e.type === "goal" || e.type === "own_goal" || e.type === "red_card" || e.type === "penalty_missed")
    .slice(0, 8)
    .map((e) => describeEvent(e, match.homeTeamId, homeName, awayName));

  const keyMoments =
    keyEvents.length > 0
      ? keyEvents.join("; ")
      : `a competitive ${homeName} vs ${awayName} World Cup match finishing ${scoreLabel(match)}.`;

  return {
    competition: competitionLabel(match),
    teamA: homeName,
    teamB: awayName,
    score: scoreLabel(match),
    keyMoments,
    language,
  };
}
