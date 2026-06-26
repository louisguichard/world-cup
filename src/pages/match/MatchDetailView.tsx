import { useEffect, useMemo, useRef } from "react";
import { useScrollHeader } from "../../hooks/useScrollHeader";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { useStore } from "../../store";
import { useMatchDetailBundle } from "../../hooks/useMatchDetailBundle";
import { usePageVisibilityPolling } from "../../hooks/usePageVisibilityPolling";
import { useLiveClock } from "../../hooks/useLiveClock";
import { clearReturnContext } from "../../store/slices/navigationSlice";
import { buildTournamentHash, buildVenueHash } from "../../hooks/useHashSync";
import { resolveMatchIds } from "../../services/matchDetail/resolveMatchIds";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { MatchSummaryTab } from "./components/tabs/MatchSummaryTab";
import { MatchStatisticsTab } from "./components/tabs/MatchStatisticsTab";
import { MatchLineupsTab } from "./components/tabs/MatchLineupsTab";
import { MatchCommentaryTab } from "./components/tabs/MatchCommentaryTab";
import { MatchH2HTab } from "./components/tabs/MatchH2HTab";
import type { MatchDetailTab, MatchEvent } from "../../types";
import { APP_BRAND } from "../../config/appMeta";
import { VenueLabel } from "../../components/venue/VenueLabel";
import styles from "./MatchDetailView.module.css";

const TABS: { id: MatchDetailTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "statistics", label: "Statistics" },
  { id: "lineups", label: "Lineups" },
  { id: "commentary", label: "Commentary" },
  { id: "h2h", label: "H2H" }
];

export function MatchDetailView() {
  const activeMatchId = useStore((s) => s.activeMatchId);
  const activeMatchTab = useStore((s) => s.activeMatchTab);
  const returnContext = useStore((s) => s.returnContext);
  const closeMatchDetail = useStore((s) => s.closeMatchDetail);
  const setMatchTab = useStore((s) => s.setMatchTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setTournamentSubTab = useStore((s) => s.setTournamentSubTab);
  const liveMatches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const matchEvents = useStore((s) => s.matchEvents);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { shrunk } = useScrollHeader(scrollRef);

  // Resolve the match from official ID
  const match = useMemo(() => {
    if (!activeMatchId) return null;
    // Try live store first
    const liveById = Object.values(liveMatches).find(
      (m) => m.matchId === activeMatchId || m.id === activeMatchId
    );
    if (liveById) return liveById;
    // Fall back to materialized schedule
    const allMatches = materializeFullSchedule(teams, liveMatches);
    return allMatches.find((m) => m.matchId === activeMatchId || m.id === activeMatchId) ?? null;
  }, [activeMatchId, liveMatches, teams]);

  const { espnEventId, wcMatchId } = useMemo(
    () => resolveMatchIds(activeMatchId ?? "", liveMatches),
    [activeMatchId, liveMatches]
  );

  // Events from store (populated by PollingEngine phase 2)
  const events = useMemo((): MatchEvent[] => {
    if (!activeMatchId) return [];
    return matchEvents[activeMatchId] ?? matchEvents[espnEventId ?? ""] ?? [];
  }, [activeMatchId, espnEventId, matchEvents]);

  // Fetch bundle from WC Live API
  const { statistics, lineups, commentary, loading, refetch } = useMatchDetailBundle(
    match,
    wcMatchId
  );

  // 2-minute visibility poller when match is live
  usePageVisibilityPolling(refetch, match?.status === "live");

  // Pull-to-refresh on the scroll area
  usePullToRefresh(scrollRef, refetch);

  // Live clock (ticks between polls)
  const clockDisplay = useLiveClock(
    match?.period ?? "not_started",
    match?.clockMinute ?? 0,
    match?.clockExtra,
    match?.clockRunning ?? false
  );

  // Restore scroll on tab switch
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeMatchTab]);

  // Handle back navigation
  const handleBack = () => {
    const ctx = returnContext;
    closeMatchDetail();
    clearReturnContext();

    if (ctx) {
      if (ctx.from === "venue" && ctx.venueSlug) {
        window.history.replaceState(null, "", buildVenueHash(ctx.venueSlug));
        return;
      }
      if (ctx.from === "tournament") {
        setActiveTab("tournament");
        if (ctx.tournamentSubTab) setTournamentSubTab(ctx.tournamentSubTab);
        if (ctx.scrollY !== undefined) {
          requestAnimationFrame(() => {
            window.scrollTo(0, ctx.scrollY ?? 0);
          });
        }
        // Restore hash
        window.history.replaceState(
          null,
          "",
          buildTournamentHash(ctx.tournamentSubTab, ctx.dateKey)
        );
      } else {
        setActiveTab(ctx.from as import("../../types").TabId);
      }
    } else {
      setActiveTab("live");
    }
  };

  if (!activeMatchId) return null;

  const homeTeam = match ? teams[match.homeTeamId] : null;
  const awayTeam = match ? teams[match.awayTeamId] : null;
  const homeTeamName = homeTeam?.shortName ?? match?.homeTeamId ?? "Home";
  const awayTeamName = awayTeam?.shortName ?? match?.awayTeamId ?? "Away";

  const isLive = match?.status === "live";
  const isDone = match?.status === "completed";

  return (
    <div className={styles.root}>
      {/* ── Sticky Header ───────────────────────────── */}
      <header className={styles.header} data-shrunk={shrunk || undefined}>
        <div className={styles.headerInner}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            aria-label="Back"
          >
            ← Back
          </button>

          <div className={styles.headerScore}>
            {/* Home team */}
            <div className={styles.headerTeam}>
              {homeTeam?.logo ? (
                <img
                  src={homeTeam.logo}
                  alt=""
                  className={styles.headerTeamFlag}
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              ) : (
                <span className={styles.headerTeamFlag}>🏳️</span>
              )}
              <span className={styles.headerTeamName}>{homeTeamName}</span>
            </div>

            {/* Score + status */}
            <div className={styles.headerStatus}>
              <div className={styles.headerScorebox}>
                <span className={styles.headerScoreNum}>
                  {isDone || isLive ? (match?.homeScore ?? 0) : "–"}
                </span>
                <span className={styles.headerScoreSep}>:</span>
                <span className={styles.headerScoreNum}>
                  {isDone || isLive ? (match?.awayScore ?? 0) : "–"}
                </span>
              </div>

              {isLive ? (
                <div className={styles.statusLive}>
                  <span className={styles.statusDot} aria-hidden />
                  {clockDisplay.label}
                </div>
              ) : isDone ? (
                <span className={styles.statusText}>FT</span>
              ) : (
                <span className={styles.statusText}>
                  {match?.date
                    ? new Date(match.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "KO"}
                </span>
              )}
            </div>

            {/* Away team */}
            <div className={styles.headerTeam}>
              {awayTeam?.logo ? (
                <img
                  src={awayTeam.logo}
                  alt=""
                  className={styles.headerTeamFlag}
                  style={{ width: 32, height: 32, objectFit: "contain" }}
                />
              ) : (
                <span className={styles.headerTeamFlag}>🏳️</span>
              )}
              <span className={styles.headerTeamName}>{awayTeamName}</span>
            </div>
          </div>
        </div>

        {/* Context bar */}
        <div className={styles.contextBar}>
          <span>{APP_BRAND.tournament}</span>
          {match?.stage ? (
            <>
              <span className={styles.contextSep}>·</span>
              <span>{match.stage}</span>
            </>
          ) : match?.group ? (
            <>
              <span className={styles.contextSep}>·</span>
              <span>Group {match.group}</span>
            </>
          ) : null}
          {activeMatchId ? (
            <>
              <span className={styles.contextSep}>·</span>
              <span style={{ color: "var(--ss-brand)" }}>{activeMatchId}</span>
            </>
          ) : null}
          {match ? (
            <>
              <span className={styles.contextSep}>·</span>
              <VenueLabel
                matchId={activeMatchId ?? undefined}
                venueString={match.venue}
                inline
                compact
              />
            </>
          ) : null}
        </div>

        {/* Goal scorers strip (when events available) */}
        {events.length > 0 ? (
          <div className={styles.scorersStrip}>
            <div className={styles.scorerList}>
              {events
                .filter((e) => e.type === "goal" && e.teamId === match?.homeTeamId)
                .map((e) => (
                  <span key={e.providerId} className={styles.scorerItem}>
                    <strong>{e.playerName}</strong> {e.minute}&apos;
                  </span>
                ))}
            </div>
            <div className={`${styles.scorerList} ${styles["scorerList--right"]}`}>
              {events
                .filter((e) => e.type === "goal" && e.teamId === match?.awayTeamId)
                .map((e) => (
                  <span key={e.providerId} className={styles.scorerItem}>
                    {e.minute}&apos; <strong>{e.playerName}</strong>
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        {/* Tab nav */}
        <nav className={styles.tabNav} aria-label="Match detail tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabBtn} ${activeMatchTab === tab.id ? styles["tabBtn--active"] : ""}`}
              onClick={() => setMatchTab(tab.id)}
              aria-current={activeMatchTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Scrollable content ───────────────────────── */}
      <div className={styles.scrollArea} ref={scrollRef}>
        {activeMatchTab === "summary" && match ? (
          <MatchSummaryTab
            match={match}
            bundle={null}
            events={events}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        ) : null}

        {activeMatchTab === "statistics" ? (
          <MatchStatisticsTab
            statistics={statistics}
            loading={loading}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        ) : null}

        {activeMatchTab === "lineups" ? (
          <MatchLineupsTab
            lineups={lineups}
            loading={loading}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        ) : null}

        {activeMatchTab === "commentary" ? (
          <MatchCommentaryTab commentary={commentary} loading={loading} />
        ) : null}

        {activeMatchTab === "h2h" && match ? (
          <MatchH2HTab
            match={match}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        ) : null}

        {!match && !loading ? (
          <div className={styles.emptyState}>
            <p>Match not found.</p>
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--ss-muted)" }}>
              ID: {activeMatchId}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
