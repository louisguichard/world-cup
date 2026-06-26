import type { MergedMatch } from "../../types";
import { useStore } from "../../store";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { formatLiveClock, formatPeriodLabel } from "../../lib/formatMatchClock";
import { useMatchTheme } from "../../hooks/useMatchTheme";
import { TeamLabel } from "../team/TeamLabel";
import { TeamLabelById } from "../team/TeamLabelById";

type Props = {
  match: MergedMatch;
  variant: "primary" | "secondary";
};

export function LiveMatchBento({ match, variant }: Props) {
  const teams = useStore((s) => s.teams);
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const matchTheme = useMatchTheme(match.homeTeamId, match.awayTeamId);
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);

  const isLive = match.status === "live";
  const clockLabel = isLive ? formatLiveClock(match) : "FT";
  const periodLabel = isLive ? formatPeriodLabel(match.period, match.status) : null;

  return (
    <article
      className={`live-hero-card live-hero-themed live-hero-card--${variant}`}
      style={matchTheme}
    >
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
        {periodLabel ? <span className="live-hero-period">{periodLabel}</span> : null}
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
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

      {broadcast ? (
        <div className="broadcast-bar broadcast-bar--hero">
          <span className="network-badge network-badge--en">{broadcast.englishNetwork}</span>
          <span className="network-badge network-badge--es">{broadcast.spanishNetwork}</span>
          {broadcast.streaming.map((service) => (
            <span key={service} className="network-badge network-badge--stream">
              {service}
            </span>
          ))}
          {broadcast.isConcurrent ? (
            <span className="network-badge network-badge--warn">Concurrent</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
