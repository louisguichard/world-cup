import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../../../store";
import { aggregateTournamentStats } from "../../../../lib/aggregateTournamentStats";
import { deriveMatchAwards } from "../../../../lib/deriveMatchAwards";
import { buildWorldCupHistoryStats } from "../../../../lib/worldCupHistoryStats";
import {
  ALL_TIME_APPEARANCES,
  ALL_TIME_TEAM_TITLES,
  ALL_TIME_TOP_SCORERS,
} from "../../../../data/worldCupAllTimeLeaders";
import type { TournamentStatsBundle } from "../../../../services/matchDetail/fetchTournamentStats";
import { fetchTournamentStats } from "../../../../services/matchDetail/fetchTournamentStats";
import { TournamentLeaderboard } from "../stats/TournamentLeaderboard";
import { AllTimeLeadersSection } from "../stats/AllTimeLeadersSection";
import { MatchAwardsFeed } from "../stats/MatchAwardsFeed";
import styles from "../../TournamentView.module.css";

export function TournamentStatsTab() {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const matchEvents = useStore((s) => s.matchEvents);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const worldCupHistoryBundle = useStore((s) => s.worldCupHistoryBundle);

  const historyStats = useMemo(
    () => buildWorldCupHistoryStats(worldCupHistoryBundle),
    [worldCupHistoryBundle]
  );

  const titleLeaders =
    historyStats.titleLeaders.length > 0 ? historyStats.titleLeaders : ALL_TIME_TEAM_TITLES;
  const bootLeaders =
    historyStats.topScorersFromBoot.length > 0 ? historyStats.topScorersFromBoot : ALL_TIME_TOP_SCORERS;
  const titlesFromApi = historyStats.titleLeaders.length > 0;
  const scorersFromApi = historyStats.topScorersFromBoot.length > 0;

  const [bundle, setBundle] = useState<TournamentStatsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const allMatches = useMemo(() => Object.values(liveMatches), [liveMatches]);

  const { topScorers, topAssists } = useMemo(
    () => aggregateTournamentStats({ matches: allMatches, matchEvents }),
    [allMatches, matchEvents]
  );

  const matchAwards = useMemo(
    () => deriveMatchAwards({ matches: allMatches, matchEvents }),
    [allMatches, matchEvents]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTournamentStats().then((data) => {
      if (!cancelled) {
        setBundle(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !bundle) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ height: 48 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      <div className={styles.statsIntro}>
        <h2 className={styles.statsIntroTitle}>2026 leaders &amp; awards</h2>
        <p className={styles.statsIntroText}>
          Tournament tables update from live match events. All-time records are historical FIFA
          benchmarks for context.
        </p>
      </div>

      <TournamentLeaderboard
        title="Top scorers · World Cup 2026"
        stats={topScorers}
        teams={teams}
        unit="G"
      />

      <TournamentLeaderboard
        title="Top assists · World Cup 2026"
        stats={topAssists}
        teams={teams}
        unit="A"
      />

      <MatchAwardsFeed
        rows={matchAwards}
        teams={teams}
        onOpenMatch={(matchId) => openMatchDetail(matchId, { from: "tournament", tournamentSubTab: "stats" })}
      />

      <AllTimeLeadersSection
        title="All-time top scorers"
        leaders={bootLeaders}
        valueSuffix="G"
        note={
          scorersFromApi
            ? "Golden Boot highs from World Cup1 history database."
            : "All-time FIFA World Cup records through 2022."
        }
      />
      <AllTimeLeadersSection title="All-time appearances" leaders={ALL_TIME_APPEARANCES} />
      <AllTimeLeadersSection
        title="Most World Cup titles"
        leaders={titleLeaders}
        valueSuffix="★"
        note={
          titlesFromApi
            ? "Title counts from World Cup1 winners database."
            : "All-time FIFA World Cup records through 2022."
        }
      />
    </div>
  );
}
