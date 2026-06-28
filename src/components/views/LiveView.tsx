import { lazy, Suspense, useMemo, useState } from "react";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { LiveMatchBento } from "../bentos/LiveMatchBento";
import { LiveGroupStandingsPanel } from "../bentos/LiveGroupStandingsPanel";
import { LiveStreamsPanel } from "../bentos/LiveStreamsPanel";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import { getNextKickoffMs, isNextKickoffFixture } from "../../lib/kickoffCountdown";
import { APP_COPY } from "../../lib/appCopy";
import { MODULE_IDS } from "../../lib/moduleIds";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import { useStore } from "../../store";
import { ModuleSectionActions } from "../shared/ModuleSectionActions";

const BestThirdLiveGraph = lazy(() =>
  import("../bentos/BestThirdLiveGraph").then((m) => ({ default: m.BestThirdLiveGraph }))
);
const LiveBracketEmbed = lazy(() =>
  import("../bracket/LiveBracketEmbed").then((m) => ({ default: m.LiveBracketEmbed }))
);
const RecentResultsBento = lazy(() =>
  import("../bentos/RecentResultsBento").then((m) => ({ default: m.RecentResultsBento }))
);
const QualifiedBento = lazy(() =>
  import("../bentos/QualifiedBento").then((m) => ({ default: m.QualifiedBento }))
);
const InContentionBento = lazy(() =>
  import("../bentos/QualifiedBento").then((m) => ({ default: m.InContentionBento }))
);
const EliminatedBento = lazy(() =>
  import("../bentos/QualifiedBento").then((m) => ({ default: m.EliminatedBento }))
);

function DeferredSectionSkeleton() {
  return <div className="dashboard-section-skeleton" aria-hidden="true" />;
}

export function LiveView() {
  const copy = APP_COPY.live;
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const primaryId = useStore((s) => s.primaryLiveMatchId);
  const setPrimary = useStore((s) => s.setPrimaryMatch);
  const liveCount = useStore((s) => {
    let count = 0;
    for (const m of Object.values(s.liveMatches)) {
      if (m.status === "live") count++;
    }
    return count;
  });

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

  const nextKickoffMs = useMemo(() => getNextKickoffMs(scheduleMatches), [scheduleMatches]);

  const todayMatchCount = allDayGroups.find((g) => g.isToday)?.matches.length ?? 0;

  const primary = live.find((m) => m.id === primaryId) ?? live[0];
  const secondary = live.filter((m) => m.id !== primary?.id).slice(0, 6);

  return (
    <div className="dashboard-view" data-state={liveCount > 0 ? "live" : "idle"}>
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          Road to the <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      {liveCount > 0 ? (
        <section className="dashboard-section" aria-label="Live now">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">{copy.liveNowKicker}</div>
              <h2 className="section-title-text">{copy.liveNowTitle}</h2>
            </div>
            <ModuleSectionActions moduleId={MODULE_IDS.liveMatches} refreshLabel="Refresh live scores" />
          </div>

          <div className="live-command-row">
            <div className="live-command-hero">
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
                        aria-label={copy.promoteMatch}
                      >
                        <LiveMatchBento match={m} variant="secondary" />
                      </button>
                      {m.group && m.group !== primary?.group ? (
                        <LiveGroupStandingsPanel
                          group={m.group}
                          variant="mini"
                          highlightTeamIds={[m.homeTeamId, m.awayTeamId]}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="live-command-aside">
              {primary?.group ? (
                <BentoErrorBoundary bento="LiveGroupStandingsPanel">
                  <LiveGroupStandingsPanel group={primary.group} />
                </BentoErrorBoundary>
              ) : null}
              <Suspense fallback={<DeferredSectionSkeleton />}>
                <BentoErrorBoundary bento="BestThirdLiveGraph">
                  <BestThirdLiveGraph
                    focusTeamIds={primary ? [primary.homeTeamId, primary.awayTeamId] : []}
                  />
                </BentoErrorBoundary>
              </Suspense>
            </div>
          </div>
        </section>
      ) : (
        <section className="dashboard-section">
          <div className="idle-banner">
            <span className="section-kicker">{copy.noLiveKicker}</span>
            <p>{copy.noLiveBody}</p>
          </div>
          <Suspense fallback={<DeferredSectionSkeleton />}>
            <BentoErrorBoundary bento="BestThirdLiveGraph">
              <BestThirdLiveGraph focusTeamIds={[]} />
            </BentoErrorBoundary>
          </Suspense>
        </section>
      )}

      <LiveStreamsPanel />

      <Suspense fallback={<DeferredSectionSkeleton />}>
        <div className="dashboard-section--defer">
          <RecentResultsBento />
        </div>
      </Suspense>

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
                  home={resolveTeamFromStore(teams, m.homeTeamId)}
                  away={resolveTeamFromStore(teams, m.awayTeamId)}
                  showKickoffCountdown={isNextKickoffFixture(m, nextKickoffMs)}
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

      <section
        className="dashboard-section qual-dashboard-row dashboard-section--defer"
        aria-label="Qualification"
      >
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">{copy.qualKicker}</div>
            <h2 className="section-title-text">{copy.qualTitle}</h2>
            <p className="section-note">{APP_COPY.qual.sectionLead}</p>
          </div>
          <ModuleSectionActions moduleId={MODULE_IDS.qualification} refreshLabel="Refresh qualification" />
        </div>
        <Suspense fallback={<DeferredSectionSkeleton />}>
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
        </Suspense>
      </section>

      <Suspense fallback={<DeferredSectionSkeleton />}>
        <LiveBracketEmbed />
      </Suspense>
    </div>
  );
}
