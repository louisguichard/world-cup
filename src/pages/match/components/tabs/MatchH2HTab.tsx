import { useEffect, useState } from "react";
import type { H2HBundle, MergedMatch } from "../../../../types";
import { getHistoricalMatchesForTeam, fetchMatchHistory } from "../../../../services/ZafronixClient";
import { fetchSofaRapidH2H } from "../../../../services/matchDetail/fetchSofaRapidH2H";
import { hasZafronixKey, zafronixSignupUrl } from "../../../../lib/apiSetup";
import { MatchTabEmptyState } from "../../../../components/shared/MatchTabEmptyState";
import { LoadingState } from "../../../../components/shared/LoadingState";
import styles from "../../MatchDetailView.module.css";

type Props = {
  match: MergedMatch;
  homeTeamName: string;
  awayTeamName: string;
};

function buildH2HFromZafronix(
  rawHome: import("../../../../services/ZafronixClient").ZafronixMatch[],
  rawAway: import("../../../../services/ZafronixClient").ZafronixMatch[],
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string
): H2HBundle {
  // Find matches where both teams were involved
  const awayNames = new Set([awayTeamId, awayTeamName.toLowerCase()]);
  const relevant = rawHome.filter(
    (m) =>
      awayNames.has(m.homeTeam.toLowerCase()) ||
      awayNames.has(m.awayTeam.toLowerCase())
  );

  // Also check from away team's history
  const homeNames = new Set([homeTeamId, homeTeamName.toLowerCase()]);
  const fromAway = rawAway.filter(
    (m) =>
      (homeNames.has(m.homeTeam.toLowerCase()) ||
        homeNames.has(m.awayTeam.toLowerCase())) &&
      !relevant.find((r) => r.id === m.id)
  );

  const all = [...relevant, ...fromAway];
  let team1Wins = 0;
  let team2Wins = 0;
  let draws = 0;

  for (const m of all) {
    if (m.homeScore === m.awayScore) {
      draws++;
    } else if (
      (homeNames.has(m.homeTeam.toLowerCase()) && m.homeScore > m.awayScore) ||
      (homeNames.has(m.awayTeam.toLowerCase()) && m.awayScore > m.homeScore)
    ) {
      team1Wins++;
    } else {
      team2Wins++;
    }
  }

  return {
    team1Id: homeTeamId,
    team2Id: awayTeamId,
    summary: { total: all.length, team1Wins, team2Wins, draws },
    matches: all.map((m) => ({
      id: String(m.id),
      date: m.date,
      tournament: m.competition ?? "Unknown",
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore
    }))
  };
}

export function MatchH2HTab({ match, homeTeamName, awayTeamName }: Props) {
  const [h2h, setH2h] = useState<H2HBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (match.sofaEventId) {
        const sofa = await fetchSofaRapidH2H(match.sofaEventId);
        if (cancelled) return;
        if (sofa && (sofa.homeWins + sofa.awayWins + sofa.draws > 0 || sofa.events.length > 0)) {
          setH2h({
            team1Id: match.homeTeamId,
            team2Id: match.awayTeamId,
            summary: {
              total: sofa.homeWins + sofa.awayWins + sofa.draws,
              team1Wins: sofa.homeWins,
              team2Wins: sofa.awayWins,
              draws: sofa.draws,
            },
            matches: sofa.events.map((e) => ({
              id: String(e.id),
              date: e.date,
              tournament: e.tournament ?? "SofaScore",
              homeTeam: e.homeTeam,
              awayTeam: e.awayTeam,
              homeScore: e.homeScore ?? 0,
              awayScore: e.awayScore ?? 0,
            })),
          });
          setLoading(false);
          return;
        }
      }

      const matchHistory = await fetchMatchHistory(match.id);
      if (cancelled) return;
      if (matchHistory.length > 0) {
        const bundle = buildH2HFromZafronix(
          matchHistory,
          [],
          match.homeTeamId,
          match.awayTeamId,
          homeTeamName,
          awayTeamName
        );
        if (bundle.summary.total > 0) {
          setH2h(bundle);
          setLoading(false);
          return;
        }
      }

      const [homeRes, awayRes] = await Promise.allSettled([
        getHistoricalMatchesForTeam(homeTeamName, 10),
        getHistoricalMatchesForTeam(awayTeamName, 10),
      ]);
      if (cancelled) return;
      const homeMatches = homeRes.status === "fulfilled" ? homeRes.value : [];
      const awayMatches = awayRes.status === "fulfilled" ? awayRes.value : [];
      const bundle = buildH2HFromZafronix(
        homeMatches,
        awayMatches,
        match.homeTeamId,
        match.awayTeamId,
        homeTeamName,
        awayTeamName
      );
      setH2h(bundle);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [match.id, match.homeTeamId, match.awayTeamId, match.sofaEventId, homeTeamName, awayTeamName]);

  if (loading) {
    return (
      <div className={styles.tabPanel}>
        <LoadingState label="Loading head-to-head…" />
      </div>
    );
  }

  if (!h2h || h2h.summary.total === 0) {
    const zafronixConfigured = hasZafronixKey();
    return (
      <MatchTabEmptyState
        title="No head-to-head history found."
        detail={
          zafronixConfigured
            ? "These teams may not have met recently, or Zafronix returned no overlapping fixtures."
            : "Add a free Zafronix key (separate from RapidAPI) to unlock historical H2H data."
        }
        actionLabel={zafronixConfigured ? undefined : "Get free Zafronix key"}
        actionUrl={zafronixConfigured ? undefined : zafronixSignupUrl()}
      />
    );
  }

  return (
    <div className={styles.tabPanel}>
      {/* Summary strip */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--ss-elevated)",
          borderRadius: 10,
          padding: "16px",
          marginBottom: 16
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ss-text)" }}>
            {h2h.summary.team1Wins}
          </div>
          <div style={{ fontSize: 11, color: "var(--ss-muted)", marginTop: 2 }}>
            {homeTeamName}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "var(--ss-muted)" }}>
            {h2h.summary.total} played
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ss-text)", marginTop: 2 }}>
            {h2h.summary.draws} draws
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ss-text)" }}>
            {h2h.summary.team2Wins}
          </div>
          <div style={{ fontSize: 11, color: "var(--ss-muted)", marginTop: 2 }}>
            {awayTeamName}
          </div>
        </div>
      </div>

      {/* Match history */}
      {h2h.matches.slice(0, 8).map((m) => (
        <div
          key={m.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid var(--ss-border)",
            fontSize: 13
          }}
        >
          <div style={{ flex: 1, color: "var(--ss-muted)", fontSize: 11 }}>
            <div>{m.tournament}</div>
            <div style={{ marginTop: 2 }}>
              {new Date(m.date).getFullYear()}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 2, justifyContent: "center" }}>
            <span style={{ color: "var(--ss-text)" }}>{m.homeTeam}</span>
            <span
              style={{
                background: "var(--ss-elevated)",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums"
              }}
            >
              {m.homeScore} – {m.awayScore}
            </span>
            <span style={{ color: "var(--ss-text)" }}>{m.awayTeam}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
