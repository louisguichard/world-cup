import { useMemo } from "react";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { LiveMatchBento } from "../bentos/LiveMatchBento";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { QualifiedBento, EliminatedBento, InContentionBento } from "../bentos/QualifiedBento";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import { useStore } from "../../store";

export function LiveView() {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const primaryId = useStore((s) => s.primaryLiveMatchId);
  const setPrimary = useStore((s) => s.setPrimaryMatch);

  const allMatches = useMemo(
    () =>
      Object.values(liveMatchesMap).filter((m) => !m.locked && m.status !== "completed"),
    [liveMatchesMap]
  );

  const live = useMemo(() => allMatches.filter((m) => m.status === "live"), [allMatches]);

  const dayGroups = useMemo(() => groupMatchesByDay(allMatches), [allMatches]);

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
            <p>
              No live matches right now. Check the Results tab for completed matches or the schedule
              for upcoming kickoffs.
            </p>
          </div>
        </section>
      )}

      <section className="dashboard-section" aria-label="Match schedule">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Schedule</div>
            <h2 className="section-title-text">Upcoming fixtures</h2>
          </div>
        </div>
        {dayGroups.map((group) => (
          <div key={group.date} className="schedule-day-group">
            <div className="schedule-day-label">{group.label}</div>
            <div className="schedule-list">
              {group.matches.map((m) => (
                <MatchScheduleCard
                  key={m.id}
                  match={m}
                  home={teams[m.homeTeamId]}
                  away={teams[m.awayTeamId]}
                />
              ))}
            </div>
          </div>
        ))}
        {dayGroups.length === 0 ? (
          <p className="view-note">
            No upcoming fixtures — check the Results tab for completed matches.
          </p>
        ) : null}
      </section>

      <section className="dashboard-section qual-dashboard-row" aria-label="Qualification">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Qualification</div>
            <h2 className="section-title-text">Who&apos;s through</h2>
            <p className="section-note">
              <strong>Confirmed</strong> = mathematically locked. <strong>Projected</strong> = based on current
              standings only.
            </p>
          </div>
        </div>
        <div className="live-qual-row">
          <BentoErrorBoundary bento="QualifiedBento">
            <QualifiedBento />
          </BentoErrorBoundary>
          <BentoErrorBoundary bento="InContentionBento">
            <InContentionBento />
          </BentoErrorBoundary>
          <BentoErrorBoundary bento="EliminatedBento">
            <EliminatedBento />
          </BentoErrorBoundary>
        </div>
      </section>
    </div>
  );
}
