import type { SofaTeamMatchSummary, SofaTeamPlayer, SofaTeamStatistics } from "../../types/teamProfile";
import { formatKickoffDate } from "../../lib/formatKickoff";
import { formatMarketValue, positionLabel } from "../../services/teamProfile/normalizeTeamProfile";
import { PlayerPhoto } from "../player/PlayerPhoto";

type Props = {
  players: SofaTeamPlayer[];
};

export function TeamSquadList({ players }: Props) {
  if (players.length === 0) {
    return <p className="team-sheet-empty">Squad data not available yet.</p>;
  }

  return (
    <ul className="team-squad-list">
      {players.map((p) => (
        <li key={p.id} className="team-squad-row">
          <span className="team-squad-num">{p.shirtNumber ?? p.jerseyNumber ?? "—"}</span>
          <PlayerPhoto
            name={p.shortName ?? p.name}
            photoUrl={p.imagePath}
            size="lg"
            className="team-squad-photo"
          />
          <span className="team-squad-name">
            <strong>{p.shortName ?? p.name}</strong>
            {p.clubName ? <span className="team-squad-club">{p.clubName}</span> : null}
          </span>
          <span className="team-squad-pos">{positionLabel(p.position)}</span>
          {p.marketValue ? (
            <span className="team-squad-value">
              {formatMarketValue(p.marketValue.value, p.marketValue.currency)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type StatsProps = {
  groupStats: {
    gf: number;
    ga: number;
    gd: number;
    wdl: { w: number; d: number; l: number };
    avgGoals: string;
  } | null;
  sofaStats: SofaTeamStatistics | null;
};

export function TeamStatsPanel({ groupStats, sofaStats }: StatsProps) {
  return (
    <div className="team-sheet-stats">
      {groupStats ? (
        <>
          <h3 className="team-sheet-section-title">Group stage</h3>
          <p>
            Goals {groupStats.gf} / Conceded {groupStats.ga} / GD{" "}
            {groupStats.gd >= 0 ? "+" : ""}
            {groupStats.gd}
          </p>
          <p>Avg goals per game: {groupStats.avgGoals}</p>
          <div className="team-wdl-bar" aria-label="Win draw loss breakdown">
            <span style={{ flex: groupStats.wdl.w }} className="team-wdl-bar--w" />
            <span style={{ flex: groupStats.wdl.d }} className="team-wdl-bar--d" />
            <span style={{ flex: groupStats.wdl.l }} className="team-wdl-bar--l" />
          </div>
          <p>
            W {groupStats.wdl.w} · D {groupStats.wdl.d} · L {groupStats.wdl.l}
          </p>
        </>
      ) : null}

      {sofaStats ? (
        <>
          <h3 className="team-sheet-section-title">World Cup 2026 (SofaScore)</h3>
          <dl className="team-sofa-stats-grid">
            {sofaStats.goalsScored != null ? (
              <>
                <dt>Goals scored</dt>
                <dd>{sofaStats.goalsScored}</dd>
              </>
            ) : null}
            {sofaStats.goalsConceded != null ? (
              <>
                <dt>Goals conceded</dt>
                <dd>{sofaStats.goalsConceded}</dd>
              </>
            ) : null}
            {sofaStats.avgRating != null ? (
              <>
                <dt>Avg rating</dt>
                <dd>{sofaStats.avgRating.toFixed(2)}</dd>
              </>
            ) : null}
            {sofaStats.averageBallPossession != null ? (
              <>
                <dt>Possession</dt>
                <dd>{Math.round(sofaStats.averageBallPossession)}%</dd>
              </>
            ) : null}
            {sofaStats.shotsOnTarget != null ? (
              <>
                <dt>Shots on target</dt>
                <dd>{sofaStats.shotsOnTarget}</dd>
              </>
            ) : null}
            {sofaStats.cleanSheets != null ? (
              <>
                <dt>Clean sheets</dt>
                <dd>{sofaStats.cleanSheets}</dd>
              </>
            ) : null}
            {sofaStats.bigChances != null ? (
              <>
                <dt>Big chances</dt>
                <dd>{sofaStats.bigChances}</dd>
              </>
            ) : null}
            {sofaStats.yellowCards != null ? (
              <>
                <dt>Yellow cards</dt>
                <dd>{sofaStats.yellowCards}</dd>
              </>
            ) : null}
          </dl>
        </>
      ) : (
        <p className="team-sheet-empty">Tournament statistics will appear after the daily sync.</p>
      )}
    </div>
  );
}

type MediaProps = {
  items: Array<{ id: number; title: string; thumbnailUrl?: string }>;
};

export function TeamMediaList({ items }: MediaProps) {
  if (items.length === 0) {
    return <p className="team-sheet-empty">No highlight videos cached yet.</p>;
  }

  return (
    <ul className="team-media-list">
      {items.slice(0, 12).map((item) => (
        <li key={item.id} className="team-media-row">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="team-media-thumb" loading="lazy" />
          ) : (
            <span className="team-media-thumb team-media-thumb--placeholder" aria-hidden />
          )}
          <span className="team-media-title">{item.title}</span>
        </li>
      ))}
    </ul>
  );
}

type MatchListProps = {
  title: string;
  matches: SofaTeamMatchSummary[];
  teamName: string;
};

export function TeamMatchLists({ title, matches, teamName }: MatchListProps) {
  if (matches.length === 0) return null;

  return (
    <div className="team-sofa-matches">
      <h3 className="team-sheet-section-title">{title}</h3>
      <ul className="team-match-history-list">
        {matches.map((m) => {
          const isHome = m.homeTeam.toLowerCase().includes(teamName.toLowerCase());
          const opp = isHome ? m.awayTeam : m.homeTeam;
          const ts = m.homeScore;
          const os = m.awayScore;
          const result =
            ts != null && os != null ? (ts > os ? "W" : ts < os ? "L" : "D") : null;
          return (
            <li key={m.id} className="team-match-history-row">
              <span>{result ?? (m.status === "notstarted" ? "—" : m.status ?? "—")}</span>
              <span>{opp}</span>
              <span>{ts != null && os != null ? `${ts}–${os}` : "vs"}</span>
              <time dateTime={m.date}>{m.date ? formatKickoffDate(m.date) : "—"}</time>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
