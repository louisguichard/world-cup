import { lazy, memo, Suspense, useMemo, useState } from "react";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { LiveMatchBento } from "../bentos/LiveMatchBento";
import { LiveBracketContextPanel } from "../bentos/LiveBracketContextPanel";
import { LiveGroupStandingsPanel } from "../bentos/LiveGroupStandingsPanel";
import { LiveStreamsPanel } from "../bentos/LiveStreamsPanel";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import { getNextKickoffMs, isNextKickoffFixture } from "../../lib/kickoffCountdown";
import { APP_COPY } from "../../lib/appCopy";
import { SectionLoadingFallback } from "../shared/LoadingState";
import { MODULE_IDS } from "../../lib/moduleIds";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import { useMaterializedScheduleBundle } from "../../hooks/useMaterializedSchedule";
import { useDeferredMount } from "../../hooks/useDeferredMount";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import { resolveDisplayMatch } from "../../lib/resolveDisplayMatch";
import { useBracketProjection } from "../../hooks/useBracketProjection";
import { isKnockoutMatch } from "../../lib/resolveMatchWinner";
import { isMergedMatchInActivePhase } from "../../lib/matchLifecycle";
import { useStore } from "../../store";
import { KnockoutRoundStatusBento } from "../bentos/KnockoutRoundStatusBento";
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
  return <SectionLoadingFallback />;
}

const LiveUpcomingScheduleSection = memo(function LiveUpcomingScheduleSection() {
  const copy = APP_COPY.live;
  const teams = useStore((s) => s.teams);
  const { schedule: materializedSchedule } = useMaterializedScheduleBundle();
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const scheduleMatches = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return materializedSchedule.filter((m) => {
      if (m.status === "scheduled" && !m.locked) return true;
      if (m.status === "completed") {
        const matchDay = m.date?.slice(0, 10);
        return matchDay === todayKey;
      }
      return false;
    });
  }, [materializedSchedule]);

  const allDayGroups = useMemo(() => groupMatchesByDay(scheduleMatches), [scheduleMatches]);
  const dayGroups = scheduleExpanded ? allDayGroups : allDayGroups.slice(0, 3);
  const nextKickoffMs = useMemo(() => getNextKickoffMs(scheduleMatches), [scheduleMatches]);
  const todayMatchCount = allDayGroups.find((g) => g.isToday)?.matches.length ?? 0;

  return (
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
      {allDayGroups.length === 0 ? <p className="view-note">{copy.noUpcoming}</p> : null}
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
  );
});

function LiveNowSection({
  isKnockoutActive,
  activeRoundLabel,
}: {
  isKnockoutActive: boolean;
  activeRoundLabel: string;
}) {
  const copy = APP_COPY.live;
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const primaryId = useStore((s) => s.primaryLiveMatchId);
  const setPrimary = useStore((s) => s.setPrimaryMatch);
  const { index: materializedIndex, schedule: materializedSchedule } = useMaterializedScheduleBundle();

  const live = useMemo(() => {
    const rows = Object.values(liveMatchesMap)
      .filter((m) => isMergedMatchInActivePhase(m))
      .map((m) => resolveDisplayMatch(m, materializedIndex));
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/0b077666-29e2-4011-96ad-0bcda15d5537", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0b0776" },
      body: JSON.stringify({
        sessionId: "0b0776",
        location: "LiveView.tsx:live",
        message: "live cards rendered",
        data: {
          count: rows.length,
          ids: rows.map((m) => m.matchId ?? m.id),
          teams: rows.map((m) => `${m.homeTeamId}/${m.awayTeamId}`),
          statuses: rows.map((m) => m.status),
        },
        timestamp: Date.now(),
        hypothesisId: "H1-live-ui",
      }),
    }).catch(() => {});
    // #endregion
    return rows;
  }, [liveMatchesMap, materializedIndex]);

  const primary = live.find((m) => m.id === primaryId) ?? live[0];
  const secondary = live.filter((m) => m.id !== primary?.id).slice(0, 6);
  const liveKicker = isKnockoutActive && !primary?.group ? activeRoundLabel : copy.liveNowKicker;
  const needsKnockoutProjection = Boolean(primary && isKnockoutMatch(primary));
  const bracketProjection = useBracketProjection(needsKnockoutProjection, materializedSchedule);

  return (
    <section className="dashboard-section" aria-label="Live now">
      <div className="section-heading compact">
        <div>
          <div className="section-kicker">{liveKicker}</div>
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
                  {m.group && !isKnockoutActive && m.group !== primary?.group ? (
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
          {primary && isKnockoutMatch(primary) && bracketProjection ? (
            <BentoErrorBoundary bento="LiveBracketContextPanel">
              <LiveBracketContextPanel
                liveMatch={primary}
                bracket={bracketProjection.bracket}
                teamsById={teams}
                liveMatches={liveMatchesMap}
              />
            </BentoErrorBoundary>
          ) : null}
          {!isKnockoutActive && primary?.group ? (
            <BentoErrorBoundary bento="LiveGroupStandingsPanel">
              <LiveGroupStandingsPanel group={primary.group} />
            </BentoErrorBoundary>
          ) : null}
          {!isKnockoutActive ? (
            <Suspense fallback={<DeferredSectionSkeleton />}>
              <BentoErrorBoundary bento="BestThirdLiveGraph">
                <BestThirdLiveGraph
                  focusTeamIds={primary ? [primary.homeTeamId, primary.awayTeamId] : []}
                />
              </BentoErrorBoundary>
            </Suspense>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function LiveView() {
  const copy = APP_COPY.live;
  const liveCount = useStore((s) => {
    let count = 0;
    for (const m of Object.values(s.liveMatches)) {
      if (isMergedMatchInActivePhase(m)) count++;
    }
    return count;
  });

  const { isKnockoutActive, activeRoundLabel } = useTournamentPhase();
  const qualSectionReady = useDeferredMount(!isKnockoutActive);
  const bracketEmbedReady = useDeferredMount(isKnockoutActive);
  const recentResultsReady = useDeferredMount(true);

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
        <LiveNowSection isKnockoutActive={isKnockoutActive} activeRoundLabel={activeRoundLabel} />
      ) : (
        <section className="dashboard-section">
          <div className="idle-banner">
            <span className="section-kicker">{copy.noLiveKicker}</span>
            <p>{copy.noLiveBody}</p>
          </div>
          <Suspense fallback={<DeferredSectionSkeleton />}>
            {!isKnockoutActive ? (
              <BentoErrorBoundary bento="BestThirdLiveGraph">
                <BestThirdLiveGraph focusTeamIds={[]} />
              </BentoErrorBoundary>
            ) : null}
          </Suspense>
        </section>
      )}

      <LiveStreamsPanel />

      {recentResultsReady ? (
        <Suspense fallback={<DeferredSectionSkeleton />}>
          <div className="dashboard-section--defer">
            <RecentResultsBento />
          </div>
        </Suspense>
      ) : (
        <DeferredSectionSkeleton />
      )}

      {isKnockoutActive ? (
        <div className="dashboard-section">
          <BentoErrorBoundary bento="KnockoutRoundStatusBento">
            <KnockoutRoundStatusBento />
          </BentoErrorBoundary>
        </div>
      ) : null}

      <LiveUpcomingScheduleSection />

      {!isKnockoutActive ? (
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
          {qualSectionReady ? (
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
          ) : (
            <DeferredSectionSkeleton />
          )}
        </section>
      ) : null}

      {isKnockoutActive && bracketEmbedReady ? (
        <Suspense fallback={<DeferredSectionSkeleton />}>
          <LiveBracketEmbed />
        </Suspense>
      ) : null}
    </div>
  );
}
