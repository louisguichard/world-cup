import type { MergedMatch } from "../../types";
import { useStore } from "../../store";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { detectKickoffConflict } from "../../lib/scheduleConflict";
import { ScheduleConflictBadge } from "../shared/ScheduleConflictBadge";
import { useLiveClock } from "../../hooks/useLiveClock";

type Props = {
  match: MergedMatch;
  variant: "primary" | "secondary";
};

export function LiveMatchBento({ match, variant }: Props) {
  const teams = useStore((s) => s.teams);
  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);
  const kickoffConflict = detectKickoffConflict(match);

  const clock = useLiveClock(
    match.period ?? (match.status === "live" ? "second_half" : "not_started"),
    match.clockMinute ?? 0,
    match.clockExtra,
    match.clockRunning ?? match.status === "live"
  );

  return (
    <article className={`live-hero-card live-hero-card--${variant}`}>
      <div className="live-hero-header">
        <span className="live-pill">
          <span className="live-pill-dot" aria-hidden />
          LIVE
        </span>
        <span className="live-hero-clock">{clock.label}</span>
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
      </div>

      <div className="score-line live-hero-scoreline">
        <span className="team-label">
          {home?.logo ? <img src={home.logo} alt="" width={36} height={36} /> : null}
          <span>{home?.shortName ?? match.homeTeamId}</span>
        </span>
        <strong className="live-hero-score">{match.homeScore ?? 0}</strong>
        <span className="schedule-score-sep">:</span>
        <strong className="live-hero-score">{match.awayScore ?? 0}</strong>
        <span className="team-label right">
          {away?.logo ? <img src={away.logo} alt="" width={36} height={36} /> : null}
          <span>{away?.shortName ?? match.awayTeamId}</span>
        </span>
      </div>

      {kickoffConflict ? <ScheduleConflictBadge conflict={kickoffConflict} /> : null}

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
