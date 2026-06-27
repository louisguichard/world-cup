import { useMemo, useState } from "react";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { LiveMatchBento } from "../bentos/LiveMatchBento";
import { BestThirdLiveGraph } from "../bentos/BestThirdLiveGraph";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { RecentResultsBento } from "../bentos/RecentResultsBento";
import { QualifiedBento, EliminatedBento, InContentionBento } from "../bentos/QualifiedBento";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";

export function LiveView() {
  const copy = APP_COPY.live;
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const primaryId = useStore((s) => s.primaryLiveMatchId);
  const setPrimary = useStore((s) => s.setPrimaryMatch);

  const live = useMemo(
    () => Object.values(liveMatchesMap).filter((m) => m.status === "live"),
    [liveMatchesMap]
  );

  const scheduleMatches = useMemo(
    () => Object.values(liveMatchesMap).filter((m) => m.status === "scheduled" && !m.locked),
    [liveMatchesMap]
  );

  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const allDayGroups = useMemo(() => groupMatchesByDay(scheduleMatches), [scheduleMatches]);
  const dayGroups = scheduleExpanded ? allDayGroups : allDayGroups.slice(0, 3);

  const nextFixtureId = useMemo(() => {
    if (scheduleMatches.length === 0) return null;
    const sorted = [...scheduleMatches].sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date)
    );
    return sorted[0]?.id ?? sorted[0]?.matchId ?? null;
  }, [scheduleMatches]);

  const todayMatchCount = allDayGroups.find((g) => g.isToday)?.matches.length ?? 0;

  const primary = live.find((m) => m.id === primaryId) ?? live[0];
  const secondary = live.filter((m) => m.id !== primary?.id).slice(0, 6);

  return (
    <div className="dashboard-view" data-state={live.length > 0 ? "live" : "idle"}>
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          Road to the <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      {live.length > 0 ? (
        <section className="dashboard-section" aria-label="Live now">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">{copy.liveNowKicker}</div>
              <h2 className="section-title-text">{copy.liveNowTitle}</h2>
            </div>
          </div>

          <div className="live-command-row">
            <div className="live-command-hero">
              <BentoErrorBoundary bento="LiveMatchBento">
                {primary ? <LiveMatchBento match={primary} variant="primary" /> : null}
              </BentoErrorBoundary>
            </div>
            <BentoErrorBoundary bento="BestThirdLiveGraph">
              <BestThirdLiveGraph
                focusTeamIds={
                  primary ? [primary.homeTeamId, primary.awayTeamId] : []
                }
              />
            </BentoErrorBoundary>
          </div>

          {secondary.length > 0 ? (
            <div className="live-now-strip" role="list">
              {secondary.map((m) => (
                <div key={m.id} className="live-now-strip-item" role="listitem">
                  <button
                    type="button"
                    className="live-secondary-tap"
                    onClick={() => setPrimary(m.id)}
                    aria-label={copy.promoteMatch}
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
            <span className="section-kicker">{copy.noLiveKicker}</span>
            <p>{copy.noLiveBody}</p>
          </div>
          <BentoErrorBoundary bento="BestThirdLiveGraph">
            <BestThirdLiveGraph focusTeamIds={[]} />
          </BentoErrorBoundary>
        </section>
      )}

      <RecentResultsBento />

      <section className="dashboard-section" aria-label="Upcoming fixtures">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">{copy.scheduleKicker}</div>
            <h2 className="section-title-text">{copy.scheduleTitle}</h2>
          </div>
        </div>
        {dayGroups.map((group) => (
          <div key={group.dateKey} className="schedule-day-group">
            <div className="schedule-day-label">
              {group.label}
              {group.isToday && todayMatchCount > 0 ? (
                <span className="schedule-day-count">{todayMatchCount}</span>
              ) : null}
            </div>
            <div className="schedule-list">
              {group.matches.map((m) => (
                <MatchScheduleCard
                  key={m.id}
                  match={m}
                  home={teams[m.homeTeamId]}
                  away={teams[m.awayTeamId]}
                  showKickoffCountdown={
                    nextFixtureId != null && (m.id === nextFixtureId || m.matchId === nextFixtureId)
                  }
                />
              ))}
            </div>
          </div>
        ))}
        {allDayGroups.length === 0 ? (
          <p className="view-note">{copy.noUpcoming}</p>
        ) : null}
        {allDayGroups.length > 3 ? (
          <button
            type="button"
            className="schedule-expand-btn"
            onClick={() => setScheduleExpanded((v) => !v)}
            aria-expanded={scheduleExpanded}
          >
            {scheduleExpanded ? copy.showLess : copy.showAllDays(allDayGroups.length)}
          </button>
        ) : null}
      </section>

      <section className="dashboard-section qual-dashboard-row" aria-label="Qualification">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">{copy.qualKicker}</div>
            <h2 className="section-title-text">{copy.qualTitle}</h2>
            <p className="section-note">{APP_COPY.qual.sectionLead}</p>
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
