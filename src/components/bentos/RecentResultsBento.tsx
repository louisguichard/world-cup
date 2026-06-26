import { useMemo } from "react";
import { localDateKey, formatTimeAgo, yesterdayDateKey } from "../../lib/localDate";
import type { MergedMatch, Team } from "../../types";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";

function truncateName(name: string, max = 10): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

type ResultRowProps = {
  match: MergedMatch;
  home?: Team;
  away?: Team;
  onSelect: (teamId: string) => void;
};

function ResultRow({ match, home, away, onSelect }: ResultRowProps) {
  const homeName = truncateName(home?.shortName ?? match.homeTeamId);
  const awayName = truncateName(away?.shortName ?? match.awayTeamId);
  const ago = formatTimeAgo(match.date);

  return (
    <button type="button" className="recent-result-row" onClick={() => onSelect(match.homeTeamId)}>
      <span className="recent-result-team recent-result-team--home">
        <TeamFlag team={home} teamId={match.homeTeamId} />
        <span>{homeName}</span>
      </span>
      <span className="recent-result-score">
        {match.homeScore ?? 0} – {match.awayScore ?? 0}
      </span>
      <span className="recent-result-team recent-result-team--away">
        <TeamFlag team={away} teamId={match.awayTeamId} />
        <span>{awayName}</span>
      </span>
      <span className="recent-result-meta">
        <span className="final-pill">FT</span>
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

  const { today, yesterday, total } = useMemo(() => {
    const now = new Date();
    const todayKey = localDateKey(now);
    const yKey = yesterdayDateKey(now);

    const completed = Object.values(liveMatches)
      .filter((m) => m.status === "completed" && m.homeScore !== undefined)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const todayMatches: MergedMatch[] = [];
    const yesterdayMatches: MergedMatch[] = [];

    for (const match of completed) {
      const key = localDateKey(new Date(match.date));
      if (key === todayKey) todayMatches.push(match);
      else if (key === yKey) yesterdayMatches.push(match);
    }

    const capped: { label: string; matches: MergedMatch[] }[] = [];
    let remaining = 8;

    if (todayMatches.length > 0) {
      const slice = todayMatches.slice(0, remaining);
      capped.push({ label: `Today (${todayMatches.length})`, matches: slice });
      remaining -= slice.length;
    }

    if (remaining > 0 && yesterdayMatches.length > 0) {
      capped.push({
        label: `Yesterday (${yesterdayMatches.length})`,
        matches: yesterdayMatches.slice(0, remaining)
      });
    }

    return {
      sections: capped,
      today: todayMatches,
      yesterday: yesterdayMatches,
      total: todayMatches.length + yesterdayMatches.length
    };
  }, [liveMatches]);

  const sections = useMemo(() => {
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
    if (todayMatches.length > 0) {
      const slice = todayMatches.slice(0, remaining);
      result.push({ label: `Today (${todayMatches.length})`, matches: slice });
      remaining -= slice.length;
    }
    if (remaining > 0 && yesterdayMatches.length > 0) {
      result.push({
        label: `Yesterday (${yesterdayMatches.length})`,
        matches: yesterdayMatches.slice(0, remaining)
      });
    }
    return result;
  }, [liveMatches]);

  if (sections.length === 0) return null;

  return (
    <section className="recent-results-bento dashboard-section" aria-label="Recent results">
      <div className="section-heading compact">
        <div>
          <div className="section-kicker">Results</div>
          <h2 className="section-title-text">Recent results</h2>
        </div>
        {total > 8 ? (
          <button type="button" className="recent-results-link" onClick={() => setActiveTab("results")}>
            See all results →
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
