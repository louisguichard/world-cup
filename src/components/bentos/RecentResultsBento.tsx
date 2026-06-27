import { useMemo } from "react";
import { localDateKey, formatTimeAgo, yesterdayDateKey } from "../../lib/localDate";
import {
  flagTeamIdForMatch,
  resolveMatchTeam,
  scheduleNameHintForMatch,
  teamDisplayNameForMatch,
} from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import type { MergedMatch, Team } from "../../types";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";

type ResultRowProps = {
  match: MergedMatch;
  home?: Team;
  away?: Team;
  onSelect: (teamId: string) => void;
};

function ResultRow({ match, home, away, onSelect }: ResultRowProps) {
  const teams = useStore((s) => s.teams);
  const resolvedHome = home ?? resolveMatchTeam(match, "home", teams);
  const resolvedAway = away ?? resolveMatchTeam(match, "away", teams);
  const homeName = teamDisplayNameForMatch(match, "home", teams);
  const awayName = teamDisplayNameForMatch(match, "away", teams);
  const ago = formatTimeAgo(match.date);

  return (
    <button type="button" className="recent-result-row" onClick={() => onSelect(match.homeTeamId)}>
      <span className="recent-result-team recent-result-team--home">
        <TeamFlag
          team={resolvedHome}
          teamId={flagTeamIdForMatch(match, "home", teams)}
          nameHint={scheduleNameHintForMatch(match, "home")}
          size="sm"
          compact
        />
        <span className="team-name-text">{homeName}</span>
      </span>
      <span className="recent-result-score">
        {match.homeScore ?? 0} – {match.awayScore ?? 0}
      </span>
      <span className="recent-result-team recent-result-team--away">
        <TeamFlag
          team={resolvedAway}
          teamId={flagTeamIdForMatch(match, "away", teams)}
          nameHint={scheduleNameHintForMatch(match, "away")}
          size="sm"
          compact
        />
        <span className="team-name-text">{awayName}</span>
      </span>
      <span className="recent-result-meta">
        <span className="final-pill">{APP_COPY.match.final}</span>
        {ago ? <span className="recent-result-ago">{ago}</span> : null}
      </span>
    </button>
  );
}

export function RecentResultsBento() {
  const liveMatches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const { sections, total } = useMemo(() => {
    const now = new Date();
    const todayKey = localDateKey(now);
    const yKey = yesterdayDateKey(now);

    const completed = Object.values(liveMatches)
      .filter((m) => m.status === "completed" && m.homeScore !== undefined)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const todayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === todayKey);
    const yesterdayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === yKey);

    const result: { label: string; matches: MergedMatch[] }[] = [];
    let remaining = 8;

    const res = APP_COPY.results;

    if (todayMatches.length > 0) {
      const slice = todayMatches.slice(0, remaining);
      result.push({ label: `${res.today} (${todayMatches.length})`, matches: slice });
      remaining -= slice.length;
    }
    if (remaining > 0 && yesterdayMatches.length > 0) {
      result.push({
        label: `${res.yesterday} (${yesterdayMatches.length})`,
        matches: yesterdayMatches.slice(0, remaining)
      });
    }

    return { sections: result, total: todayMatches.length + yesterdayMatches.length };
  }, [liveMatches]);

  if (sections.length === 0) return null;

  const live = APP_COPY.live;
  const res = APP_COPY.results;

  return (
    <section className="recent-results-bento" aria-label={live.recentResultsTitle}>
      <div className="section-heading compact">
        <div>
          <div className="section-kicker">{live.recentResultsKicker}</div>
          <h2 className="section-title-text">{live.recentResultsTitle}</h2>
        </div>
        {total > 8 ? (
          <button type="button" className="recent-results-link" onClick={() => setActiveTab("results")}>
            {live.seeAllResults} →
          </button>
        ) : null}
      </div>
      <div className="recent-results-list">
        {sections.map((section) => (
          <div key={section.label} className="recent-results-group">
            <h3 className="recent-results-group-label">{section.label}</h3>
            {section.matches.map((match) => (
              <ResultRow
                key={match.id}
                match={match}
                home={teams[match.homeTeamId]}
                away={teams[match.awayTeamId]}
                onSelect={openTeamSheet}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
