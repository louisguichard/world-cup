import { useMemo } from "react";
import { localDateKey, yesterdayDateKey } from "../../lib/localDate";
import { resolveDisplayMatch } from "../../lib/resolveDisplayMatch";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { useMaterializedMatchIndex } from "../../hooks/useMaterializedMatchIndex";
import { VenueLabel } from "../venue/VenueLabel";
import { PenaltyResultRow } from "./RecentResultRow";

export function RecentResultsBento() {
  const liveMatches = useStore((s) => s.liveMatches);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const materializedIndex = useMaterializedMatchIndex();

  const { sections, total } = useMemo(() => {
    const now = new Date();
    const todayKey = localDateKey(now);
    const yKey = yesterdayDateKey(now);

    const completed = Object.values(liveMatches)
      .filter((m) => m.status === "completed" && m.homeScore !== undefined)
      .map((m) => resolveDisplayMatch(m, materializedIndex))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    const todayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === todayKey);
    const yesterdayMatches = completed.filter((m) => localDateKey(new Date(m.date)) === yKey);

    const result: { label: string; matches: typeof completed }[] = [];
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
        matches: yesterdayMatches.slice(0, remaining),
      });
    }

    return { sections: result, total: todayMatches.length + yesterdayMatches.length };
  }, [liveMatches, materializedIndex]);

  if (sections.length === 0) return null;

  const live = APP_COPY.live;

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
                <div key={match.id} className="recent-result-item">
                  <PenaltyResultRow match={match} onSelect={openTeamSheet} />
                  {match.matchId || match.venue ? (
                    <div className="recent-result-extra">
                      <VenueLabel matchId={match.matchId} venueString={match.venue} inline />
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
