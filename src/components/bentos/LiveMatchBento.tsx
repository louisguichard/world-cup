import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import type { MergedMatch } from "../../types";
import { useMemo } from "react";
import { useStore } from "../../store";
import { BroadcastBar } from "../match/BroadcastBar";
import { hasDisplayableMatchEvents, MatchGoalScorers } from "../match/MatchGoalScorers";
import { WeatherBadge } from "../match/WeatherBadge";
import { PanelErrorBoundary } from "../ErrorBoundary";
import { GoalCelebrationOverlay } from "../match/GoalCelebrationOverlay";
import goalStyles from "../match/GoalCelebrationOverlay.module.css";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { formatLiveClock, formatPeriodLabel } from "../../lib/formatMatchClock";
import { APP_COPY } from "../../lib/appCopy";
import { useMatchTheme } from "../../hooks/useMatchTheme";
import { useGoalDetector } from "../../hooks/useGoalDetector";
import { useEventPlayerPhotos } from "../../hooks/useEventPlayerPhotos";
import { teamLiveCardName } from "../../lib/teamIdentity";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";
import { VenueLabel } from "../venue/VenueLabel";
import { resolveEventsForMatch } from "../../lib/resolveMatchEvents";

type Props = {
  match: MergedMatch;
  variant: "primary" | "secondary";
};

export function LiveMatchBento({ match, variant }: Props) {
  const teams = useStore((s) => s.teams);
  const matchEvents = useStore((s) => s.matchEvents);
  const home = resolveTeamFromStore(teams, match.homeTeamId);
  const away = resolveTeamFromStore(teams, match.awayTeamId);
  const matchTheme = useMatchTheme(match.homeTeamId, match.awayTeamId);

  const isLive = match.status === "live";
  const clockLabel = isLive ? formatLiveClock(match) : APP_COPY.match.final;
  const periodLabel = isLive ? formatPeriodLabel(match.period, match.status) : null;
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);
  const events = useMemo(
    () => resolveEventsForMatch(match, matchEvents, teams),
    [match, matchEvents, teams]
  );
  const hasEvents = hasDisplayableMatchEvents(events);

  const { isGoalActive, latestGoal, secondsRemaining } = useGoalDetector(match.id);
  const homeName = teamLiveCardName(home, match.homeTeamId);
  const awayName = teamLiveCardName(away, match.awayTeamId);
  const isCompact = true;

  const scorerEvents = useMemo(
    () => (latestGoal?.scorerEvent ? [latestGoal.scorerEvent] : []),
    [latestGoal?.scorerEvent]
  );
  const scorerPhotos = useEventPlayerPhotos({ events: scorerEvents, homeTeam: home, awayTeam: away });
  const scorerPhotoUrl = latestGoal?.scorerEvent
    ? scorerPhotos[latestGoal.scorerEvent.providerId]
    : undefined;

  return (
    <div
      className={`fixture-glow-wrap live-hero-themed${isLive ? " is-live" : ""} live-hero-card-wrap live-hero-card-wrap--${variant}`}
      style={matchTheme}
    >
      <article
        className={`live-hero-card live-hero-card--${variant}${isGoalActive ? ` ${goalStyles.cardGoalActive}` : ""}`}
      >
        <GoalCelebrationOverlay
          isActive={isGoalActive}
          latestGoal={latestGoal}
          secondsRemaining={secondsRemaining}
          homeTeamName={homeName}
          awayTeamName={awayName}
          scorerPhotoUrl={scorerPhotoUrl}
        />
        <div
          className={`live-hero-card-body ${goalStyles.cardContentLayer}${isGoalActive ? ` ${goalStyles.cardContentGoalActive}` : ""}`}
        >
      <div className="team-accent-bar" aria-hidden />
      <div className="live-hero-header">
        {isLive ? (
          <span className="live-pill">
            <span className="live-pill-dot" aria-hidden />
            LIVE
          </span>
        ) : null}
        {isLive && clockLabel ? (
          <span className="live-hero-clock">{clockLabel}</span>
        ) : null}
        {periodLabel ? (
          <span className="live-hero-period">{periodLabel}</span>
        ) : null}
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
        <PanelErrorBoundary name="Weather">
          <WeatherBadge
            matchId={match.matchId}
            venueString={match.venue}
            cityHint={broadcast?.venue.city}
          />
        </PanelErrorBoundary>
      </div>

      {match.matchId || match.venue ? (
        <div className="live-hero-meta">
          <VenueLabel matchId={match.matchId} venueString={match.venue} inline compact />
        </div>
      ) : null}

      <div className="score-line live-hero-scoreline">
        {home ? (
          <TeamLabel team={home} displayName={homeName} flagCompact={isCompact} />
        ) : (
          <TeamLabelById teamId={match.homeTeamId} displayName={homeName} flagCompact={isCompact} />
        )}
        <strong className="live-hero-score">{match.homeScore ?? 0}</strong>
        <span className="schedule-score-sep">:</span>
        <strong className="live-hero-score">{match.awayScore ?? 0}</strong>
        {away ? (
          <TeamLabel team={away} align="right" displayName={awayName} flagCompact={isCompact} />
        ) : (
          <TeamLabelById teamId={match.awayTeamId} align="right" displayName={awayName} flagCompact={isCompact} />
        )}
      </div>

      <div
        className="match-goal-scorers-slot"
        aria-hidden={!hasEvents}
        data-empty={hasEvents ? undefined : "true"}
      >
        {hasEvents ? (
          <MatchGoalScorers
            events={events}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeTeam={home}
            awayTeam={away}
            photoSize="sm"
          />
        ) : isLive ? (
          <p className="live-hero-events-placeholder">Goals, cards, and subs appear here as they happen.</p>
        ) : null}
      </div>

      <div className="broadcast-bar-slot">
        <BroadcastBar
          matchId={match.matchId}
          kickoffUtc={match.date}
          variant="hero"
        />
      </div>
      </div>
    </article>
    </div>
  );
}
