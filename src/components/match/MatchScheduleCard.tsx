import type { MergedMatch, Team } from "../../types";
import { memo, useMemo } from "react";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { formatKickoff, formatKickoffDate } from "../../lib/formatKickoff";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { APP_COPY } from "../../lib/appCopy";
import { matchStageLabel } from "../../lib/matchStageLabel";
import {
  getBestThirdBubbleTeamIds,
  matchInvolvesBestThirdBubble,
} from "../../lib/thirdPlaceLiveStatus";
import { useQualificationContext } from "../../store/selectors/qualificationSelectors";
import { useMatchTheme } from "../../hooks/useMatchTheme";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";
import { BroadcastBar } from "./BroadcastBar";
import { WeatherBadge } from "./WeatherBadge";
import { MatchGoalScorers } from "./MatchGoalScorers";
import { VenueLabel } from "../venue/VenueLabel";
import { KickoffCountdown } from "./KickoffCountdown";
import { FixtureBettingSection } from "./FixtureBettingSection";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  teamDisplayNameForMatch,
  teamLiveCardNameForMatch,
  scheduleNameHintForMatch,
} from "../../lib/matchTeamDisplay";
import { useMatchSupplement } from "../../hooks/useMatchSupplement";
import { resolveEventsForMatch } from "../../lib/resolveMatchEvents";
import { useStore } from "../../store";
import { useGoalDetector } from "../../hooks/useGoalDetector";
import { useEventPlayerPhotos } from "../../hooks/useEventPlayerPhotos";
import { GoalCelebrationOverlay } from "./GoalCelebrationOverlay";
import goalStyles from "./GoalCelebrationOverlay.module.css";
import { ScenarioBranchButton } from "../analyst/ScenarioBranchButton";

type Props = {
  match: MergedMatch;
  home?: Team;
  away?: Team;
  compact?: boolean;
  onSelect?: () => void;
  /** Shows a live countdown clock until kickoff (next fixture highlight). */
  showKickoffCountdown?: boolean;
};

export const MatchScheduleCard = memo(function MatchScheduleCard({
  match,
  home,
  away,
  compact,
  onSelect,
  showKickoffCountdown,
}: Props) {
  const matchEvents = useStore((s) => s.matchEvents);
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const qualContext = useQualificationContext();
  const events = useMemo(
    () => resolveEventsForMatch(match, matchEvents, teams),
    [match, matchEvents, teams]
  );
  const kampSupplement = useMatchSupplement(match);
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);
  const kickoffUtc = match.date;
  const isLive = match.status === "live";
  const isDone = match.status === "completed" || match.locked;
  const matchTheme = useMatchTheme(match.homeTeamId, match.awayTeamId, isLive ? "live" : "default");

  const bubbleTeamIds = useMemo(
    () => getBestThirdBubbleTeamIds(standings, qualContext),
    [standings, qualContext]
  );
  const isBubbleMatch = useMemo(
    () => !isLive && matchInvolvesBestThirdBubble(match, bubbleTeamIds),
    [match, bubbleTeamIds, isLive]
  );

  const resolvedHome = home ?? resolveMatchTeam(match, "home", teams);
  const resolvedAway = away ?? resolveMatchTeam(match, "away", teams);

  const { isGoalActive, latestGoal, secondsRemaining } = useGoalDetector(match.id);
  const scorerEvents = useMemo(
    () => (latestGoal?.scorerEvent ? [latestGoal.scorerEvent] : []),
    [latestGoal?.scorerEvent]
  );
  const scorerPhotos = useEventPlayerPhotos({ events: scorerEvents, homeTeam: resolvedHome, awayTeam: resolvedAway });
  const scorerPhotoUrl = latestGoal?.scorerEvent
    ? scorerPhotos[latestGoal.scorerEvent.providerId]
    : undefined;
  const homeDisplayName = teamDisplayNameForMatch(match, "home", teams);
  const awayDisplayName = teamDisplayNameForMatch(match, "away", teams);
  const homeName = isLive
    ? teamLiveCardNameForMatch(match, "home", teams)
    : homeDisplayName;
  const awayName = isLive
    ? teamLiveCardNameForMatch(match, "away", teams)
    : awayDisplayName;
  const homeFlagId = flagTeamIdForMatch(match, "home", teams);
  const awayFlagId = flagTeamIdForMatch(match, "away", teams);
  const homeNameHint = scheduleNameHintForMatch(match, "home");
  const awayNameHint = scheduleNameHintForMatch(match, "away");
  const stageLabel = match.stage ? matchStageLabel(match) : undefined;

  const metaTimeDisplay = isDone
    ? `${formatKickoffDate(kickoffUtc)} · ${APP_COPY.match.final}`
    : isLive
      ? formatLiveClock(match)
      : formatKickoff(kickoffUtc);

  const cardClass = [
    "schedule-card",
    isLive ? "is-live" : "",
    showKickoffCountdown ? "schedule-card--next-ko" : "",
    compact ? "schedule-card--compact" : "",
    onSelect ? "schedule-card--btn" : "",
    isGoalActive ? goalStyles.cardGoalActive : "",
  ]
    .filter(Boolean)
    .join(" ");

  const glowWrapClass = [
    "fixture-glow-wrap",
    "schedule-card-themed",
    isLive ? "is-live" : "",
    isBubbleMatch ? "is-bubble-match" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const celebrationOverlay = isLive ? (
    <GoalCelebrationOverlay
      isActive={isGoalActive}
      latestGoal={latestGoal}
      secondsRemaining={secondsRemaining}
      homeTeamName={homeName}
      awayTeamName={awayName}
      scorerPhotoUrl={scorerPhotoUrl}
    />
  ) : null;

  const body = (
    <>
      {celebrationOverlay}
      <div className={isLive ? `${goalStyles.cardContentLayer} fixture-card-body` : "fixture-card-body"}>
      {isLive ? <div className="team-accent-bar" aria-hidden /> : null}
      {showKickoffCountdown && !isLive && !isDone ? (
        <div className="schedule-card-countdown-row">
          <span className="schedule-card-next-label">Next kickoff</span>
          <KickoffCountdown kickoffUtc={kickoffUtc} />
        </div>
      ) : null}
      <div className="match-meta">
        <span>
          {isLive ? (
            <span className="live-pill">
              <span className="live-pill-dot" aria-hidden /> LIVE
            </span>
          ) : null}
          <time dateTime={kickoffUtc}>{metaTimeDisplay}</time>
          {(match.matchId || match.venue) ? (
            <>
              {" · "}
              <VenueLabel matchId={match.matchId} venueString={match.venue} inline nested={Boolean(onSelect)} />
            </>
          ) : null}
          {!isDone && broadcast?.venue.city ? (
            <WeatherBadge cityHint={broadcast.venue.city} />
          ) : null}
        </span>
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
        {stageLabel ? <span className="match-source espn">{stageLabel}</span> : null}
        {isDone && kampSupplement?.highlightsUrl ? (
          <a
            href={kampSupplement.highlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="match-source kamp-highlights-link"
            onClick={(e) => e.stopPropagation()}
          >
            Highlights
          </a>
        ) : null}
        {match.group ? (
          <ScenarioBranchButton groupId={match.group} matchId={match.id} />
        ) : null}
      </div>

      <div className="score-line fixture-matchup">
        {resolvedHome ? (
          <TeamLabel
            team={resolvedHome}
            displayName={isLive ? homeName : undefined}
            flagCompact={isLive}
            nested={Boolean(onSelect)}
          />
        ) : (
          <TeamLabelById
            teamId={homeFlagId}
            nameHint={homeNameHint}
            displayName={isLive ? homeName : undefined}
            flagCompact={isLive}
            nested={Boolean(onSelect)}
          />
        )}
        <strong className="schedule-score">
          {isDone || isLive ? (match.homeScore ?? 0) : "–"}
        </strong>
        <span className="schedule-score-sep">:</span>
        <strong className="schedule-score">
          {isDone || isLive ? (match.awayScore ?? 0) : "–"}
        </strong>
        {resolvedAway ? (
          <TeamLabel
            team={resolvedAway}
            align="right"
            displayName={isLive ? awayName : undefined}
            flagCompact={isLive}
            nested={Boolean(onSelect)}
          />
        ) : (
          <TeamLabelById
            teamId={awayFlagId}
            nameHint={awayNameHint}
            align="right"
            displayName={isLive ? awayName : undefined}
            flagCompact={isLive}
            nested={Boolean(onSelect)}
          />
        )}
      </div>

      {(isLive || isDone) && events.length > 0 ? (
        <div className="match-goal-scorers-slot">
          <MatchGoalScorers
            events={events}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeTeam={home}
            awayTeam={away}
            photoSize={compact ? "xs" : "sm"}
          />
        </div>
      ) : isLive ? (
        <div className="match-goal-scorers-slot" aria-hidden />
      ) : null}

      {!isDone ? (
        <FixtureBettingSection
          match={match}
          homeTeam={homeDisplayName}
          awayTeam={awayDisplayName}
        />
      ) : null}

      <BroadcastBar matchId={match.matchId} kickoffUtc={kickoffUtc} />
      </div>
    </>
  );

  const cardStyle = matchTheme;

  if (onSelect) {
    return (
      <div className={glowWrapClass} style={cardStyle}>
        <button type="button" className={cardClass} onClick={onSelect}>
          {body}
        </button>
      </div>
    );
  }

  return (
    <div className={glowWrapClass} style={cardStyle}>
      <article className={cardClass}>{body}</article>
    </div>
  );
});
