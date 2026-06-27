import type { MergedMatch } from "../../types";
import { useStore } from "../../store";
import { BroadcastBar } from "../match/BroadcastBar";
import { MatchGoalScorers } from "../match/MatchGoalScorers";
import { WeatherBadge } from "../match/WeatherBadge";
import { GoalCelebrationOverlay } from "../match/GoalCelebrationOverlay";
import goalStyles from "../match/GoalCelebrationOverlay.module.css";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { formatLiveClock, formatPeriodLabel } from "../../lib/formatMatchClock";
import { APP_COPY } from "../../lib/appCopy";
import { useMatchTheme } from "../../hooks/useMatchTheme";
import { useGoalDetector } from "../../hooks/useGoalDetector";
import { teamDisplayName } from "../../lib/teamIdentity";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";

type Props = {
  match: MergedMatch;
  variant: "primary" | "secondary";
};

export function LiveMatchBento({ match, variant }: Props) {
  const teams = useStore((s) => s.teams);
  const matchEvents = useStore((s) => s.matchEvents);
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const matchTheme = useMatchTheme(match.homeTeamId, match.awayTeamId);

  const isLive = match.status === "live";
  const clockLabel = isLive ? formatLiveClock(match) : APP_COPY.match.final;
  const periodLabel = isLive ? formatPeriodLabel(match.period, match.status) : null;
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);
  const events =
    matchEvents[match.id] ??
    matchEvents[match.matchId ?? ""] ??
    matchEvents[match.espnEventId ?? ""] ??
    [];

  const { isGoalActive, latestGoal, secondsRemaining } = useGoalDetector(match.id);
  const homeName = teamDisplayName(home, match.homeTeamId);
  const awayName = teamDisplayName(away, match.awayTeamId);

  return (
    <article
      className={`live-hero-card live-hero-themed live-hero-card--${variant}${isGoalActive ? ` ${goalStyles.cardGoalActive}` : ""}`}
      style={matchTheme}
    >
      <GoalCelebrationOverlay
        isActive={isGoalActive}
        latestGoal={latestGoal}
        secondsRemaining={secondsRemaining}
        homeTeamName={homeName}
        awayTeamName={awayName}
      />
      <div className={`live-hero-card-body ${goalStyles.cardContentLayer}`}>
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
        {periodLabel && variant === "primary" ? (
          <span className="live-hero-period">{periodLabel}</span>
        ) : null}
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
        {variant === "primary" && broadcast?.venue.city ? (
          <WeatherBadge city={broadcast.venue.city} />
        ) : null}
      </div>

      <div className="score-line live-hero-scoreline">
        {home ? (
          <TeamLabel team={home} />
        ) : (
          <TeamLabelById teamId={match.homeTeamId} />
        )}
        <strong className="live-hero-score">{match.homeScore ?? 0}</strong>
        <span className="schedule-score-sep">:</span>
        <strong className="live-hero-score">{match.awayScore ?? 0}</strong>
        {away ? (
          <TeamLabel team={away} align="right" />
        ) : (
          <TeamLabelById teamId={match.awayTeamId} align="right" />
        )}
      </div>

      <div className="match-goal-scorers-slot" aria-hidden={events.filter((e) => e.type === "goal" || e.type === "own_goal").length === 0}>
        <MatchGoalScorers
          events={events}
          homeTeamId={match.homeTeamId}
          awayTeamId={match.awayTeamId}
        />
      </div>

      <div className="broadcast-bar-slot">
        <BroadcastBar
          matchId={match.matchId}
          kickoffUtc={match.date}
          variant={variant === "primary" ? "hero" : "default"}
        />
      </div>
      </div>
    </article>
  );
}
