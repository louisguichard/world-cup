import { useMemo } from "react";
import {
  buildCompletedResultsViewModel,
  buildRecentResultsSections,
  matchResultStableId,
} from "../../lib/buildCompletedResultsViewModel";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { useMaterializedMatchIndex } from "../../hooks/useMaterializedMatchIndex";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import { VenueLabel } from "../venue/VenueLabel";
import { PenaltyResultRow } from "./RecentResultRow";

export function RecentResultsBento() {
  const liveMatches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const materializedIndex = useMaterializedMatchIndex();
  const { isKnockoutActive } = useTournamentPhase();

  const { sections, total } = useMemo(() => {
    const completed = buildCompletedResultsViewModel(liveMatches, teams, {
      sort: "recent",
      materializedIndex,
    });

    return buildRecentResultsSections(completed, {
      isKnockoutActive,
      labels: {
        today: APP_COPY.results.today,
        yesterday: APP_COPY.results.yesterday,
        earlierKnockout: APP_COPY.results.earlierKnockout,
      },
    });
  }, [liveMatches, materializedIndex, teams, isKnockoutActive]);

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
                <div key={matchResultStableId(match)} className="recent-result-item">
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
