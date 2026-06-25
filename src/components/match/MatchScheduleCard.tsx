import type { MergedMatch } from "../../types";
import type { Team } from "../../types";
import { getBroadcast, getBroadcastByKickoff } from "../../services/BroadcastLookup";
import { detectKickoffConflict } from "../../lib/scheduleConflict";
import { formatKickoffLocal } from "../../services/ScheduleLinker";

type Props = {
  match: MergedMatch;
  home?: Team;
  away?: Team;
  compact?: boolean;
  onSelect?: () => void;
};

export function MatchScheduleCard({ match, home, away, compact, onSelect }: Props) {
  const broadcast =
    (match.matchId ? getBroadcast(match.matchId) : undefined) ?? getBroadcastByKickoff(match.date);
  const conflict = detectKickoffConflict(match);
  const kickoffUtc = broadcast?.kickoffUTC ?? match.date;
  const isLive = match.status === "live";
  const isDone = match.status === "completed";

  const body = (
    <>
      <div className="match-meta">
        <span>
          {isLive ? (
            <span className="live-pill">
              <span className="live-pill-dot" aria-hidden /> LIVE
            </span>
          ) : null}
          <time dateTime={kickoffUtc}>{formatKickoffLocal(kickoffUtc)}</time>
          {broadcast?.venue.city ? ` · ${broadcast.venue.city}` : null}
        </span>
        {match.group ? <span className="match-source espn">Group {match.group}</span> : null}
      </div>

      <div className="score-line schedule-score-line">
        <span className="team-label">
          {home?.logo ? <img src={home.logo} alt="" width={28} height={28} /> : null}
          <span>{home?.shortName ?? match.homeTeamId}</span>
        </span>
        <strong className="schedule-score">
          {isDone || isLive ? (match.homeScore ?? 0) : "–"}
        </strong>
        <span className="schedule-score-sep">:</span>
        <strong className="schedule-score">
          {isDone || isLive ? (match.awayScore ?? 0) : "–"}
        </strong>
        <span className="team-label right">
          {away?.logo ? <img src={away.logo} alt="" width={28} height={28} /> : null}
          <span>{away?.shortName ?? match.awayTeamId}</span>
        </span>
      </div>

      {broadcast ? (
        <div className="broadcast-bar">
          <span className="network-badge network-badge--en">{broadcast.englishNetwork}</span>
          <span className="network-badge network-badge--es">{broadcast.spanishNetwork}</span>
          {broadcast.isConcurrent ? (
            <span className="network-badge network-badge--warn">Concurrent</span>
          ) : null}
          {!compact && broadcast.streaming.length > 0 ? (
            <span className="broadcast-stream">{broadcast.streaming.slice(0, 2).join(" · ")}</span>
          ) : null}
        </div>
      ) : null}

      {conflict ? (
        <p className="schedule-conflict-note">
          Schedule {conflict.scheduleLabel} · Feed {conflict.liveLabel}
        </p>
      ) : null}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" className={`schedule-card schedule-card--btn ${isLive ? "is-live" : ""}`} onClick={onSelect}>
        {body}
      </button>
    );
  }

  return <article className={`schedule-card ${isLive ? "is-live" : ""} ${compact ? "schedule-card--compact" : ""}`}>{body}</article>;
}
