import { useMemo } from "react";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { LiveMatchBento } from "../bentos/LiveMatchBento";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { QualifiedBento, EliminatedBento } from "../bentos/QualifiedBento";
import { useStore } from "../../store";
import type { MergedMatch } from "../../types";

function sortByDate(matches: MergedMatch[]): MergedMatch[] {
  return [...matches].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

export function LiveView() {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const primaryId = useStore((s) => s.primaryLiveMatchId);
  const setPrimary = useStore((s) => s.setPrimaryMatch);

  const allMatches = useMemo(() => Object.values(liveMatchesMap), [liveMatchesMap]);

  const live = useMemo(() => allMatches.filter((m) => m.status === "live"), [allMatches]);

  const todaySchedule = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return sortByDate(
      allMatches.filter((m) => {
        const day = new Date(m.date).toISOString().slice(0, 10);
        return m.group && (m.status === "scheduled" || day === today);
      })
    ).slice(0, 16);
  }, [allMatches]);

  const primary = live.find((m) => m.id === primaryId) ?? live[0];
  const secondary = live.filter((m) => m.id !== primary?.id).slice(0, 6);

  return (
    <div className="dashboard-view" data-state={live.length > 0 ? "live" : "idle"}>
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">United States · Canada · Mexico</div>
        <h1>
          Road to the <span className="accent">Final.</span>
        </h1>
        <p>Live scores, qualification pulse, and every match on your schedule — in your local time.</p>
      </section>

      {live.length > 0 ? (
        <section className="dashboard-section" aria-label="Live now">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">Live now</div>
              <h2 className="section-title-text">On the pitch</h2>
            </div>
          </div>

          <BentoErrorBoundary bento="LiveMatchBento">
            {primary ? <LiveMatchBento match={primary} variant="primary" /> : null}
          </BentoErrorBoundary>

          {secondary.length > 0 ? (
            <div className="live-now-strip" role="list">
              {secondary.map((m) => (
                <div key={m.id} className="live-now-strip-item" role="listitem">
                  <button
                    type="button"
                    className="live-secondary-tap"
                    onClick={() => setPrimary(m.id)}
                    aria-label="Promote match to hero"
                  >
                    <LiveMatchBento match={m} variant="secondary" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="dashboard-section">
          <div className="idle-banner">
            <span className="section-kicker">No live matches</span>
            <p>Check today&apos;s schedule below or open the Simulator to model outcomes.</p>
          </div>
        </section>
      )}

      <section className="dashboard-section" aria-label="Today's schedule">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Schedule</div>
            <h2 className="section-title-text">Upcoming fixtures</h2>
          </div>
        </div>
        <div className="schedule-list">
          {todaySchedule.map((m) => (
            <MatchScheduleCard
              key={m.id}
              match={m}
              home={teams[m.homeTeamId]}
              away={teams[m.awayTeamId]}
            />
          ))}
          {todaySchedule.length === 0 ? (
            <p className="view-note">No upcoming group fixtures in the feed right now.</p>
          ) : null}
        </div>
      </section>

      <section className="dashboard-section qual-dashboard-row" aria-label="Qualification">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Qualification</div>
            <h2 className="section-title-text">Who&apos;s through</h2>
          </div>
        </div>
        <div className="live-qual-row">
          <BentoErrorBoundary bento="QualifiedBento">
            <QualifiedBento />
          </BentoErrorBoundary>
          <BentoErrorBoundary bento="EliminatedBento">
            <EliminatedBento />
          </BentoErrorBoundary>
        </div>
      </section>
    </div>
  );
}
