import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatKickoffDate, formatKickoffTime } from "../../lib/formatKickoff";
import {
  buildQualificationContext,
  computeQualificationStatus
} from "../../lib/qualification";
import { rankBestThirds } from "../../lib/bestThirds";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useStore } from "../../store";
import { getTeamElo } from "../../services/ClubEloClient";
import { getHistoricalMatchesForTeam, type ZafronixMatch } from "../../services/ZafronixClient";
import { TeamThemeRoot } from "../team/TeamThemeRoot";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import type { MergedMatch } from "../../types";

type Tab = "overview" | "fixtures" | "stats" | "betting";
type MatchOutcome = "W" | "D" | "L";

function outcomeForTeam(match: MergedMatch, teamId: string): MatchOutcome {
  const isHome = match.homeTeamId === teamId;
  const teamScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
  const oppScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
  if (teamScore > oppScore) return "W";
  if (teamScore < oppScore) return "L";
  return "D";
}

export function TeamDetailSheet() {
  const open = useStore((s) => s.teamSheetOpen);
  const teamId = useStore((s) => s.activeTeamId);
  const close = useStore((s) => s.closeTeamSheet);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const standings = useStore((s) => s.groupStandings);
  const simulationRunning = useStore((s) => s.simulationRunning);
  const [tab, setTab] = useState<Tab>("overview");
  const [elo, setElo] = useState<number | null>(null);
  const [recentForm, setRecentForm] = useState<ZafronixMatch[]>([]);

  const team = teamId ? teams[teamId] : null;
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const qual = useMemo(
    () => (teamId ? computeQualificationStatus(teamId, standings, qualContext) : null),
    [teamId, standings, qualContext]
  );

  const groupStanding = useMemo(() => {
    if (!team) return null;
    const g = standings.find((s) => s.group === team.group);
    const row = g?.rows.find((r) => r.teamId === team.id);
    return row ? { group: g!, row } : null;
  }, [team, standings]);

  const allFixtures = useMemo(() => {
    if (!teamId) return [];
    return Object.values(liveMatches)
      .filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }, [liveMatches, teamId]);

  const stats = useMemo(() => {
    if (!groupStanding) return null;
    const { row } = groupStanding;
    const played = row.played || 1;
    return {
      gf: row.goalsFor,
      ga: row.goalsAgainst,
      gd: row.goalDifference,
      cleanSheets: 0,
      wdl: { w: row.wins, d: row.draws, l: row.losses },
      avgGoals: (row.goalsFor / played).toFixed(2)
    };
  }, [groupStanding]);

  const thirdRank = useMemo(() => {
    if (!teamId) return -1;
    return rankBestThirds(standings).findIndex((r) => r.teamId === teamId);
  }, [standings, teamId]);

  useEffect(() => {
    if (!team) return;
    void getTeamElo(team.name).then(setElo);
  }, [team]);

  useEffect(() => {
    if (!team || tab !== "overview") return;
    void getHistoricalMatchesForTeam(team.name, 7).then(setRecentForm);
  }, [team, tab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !team || !teamId) return null;

  const certaintyBadge =
    qual?.certainty === "confirmed" ? "confirmed" : qual?.certainty ? "projected" : "projected";

  const sheet = (
    <div className="team-sheet-backdrop team-sheet-backdrop--portal" role="presentation" onClick={close}>
      <div
        className="team-sheet team-sheet--portal"
        role="dialog"
        aria-label={`${teamDisplayName(team)} profile`}
        onClick={(e) => e.stopPropagation()}
      >
        <TeamThemeRoot teamId={team.id} className="team-sheet-header-themed">
          <div className="team-accent-bar" aria-hidden />
          <header className="team-sheet-header">
            <div className="team-sheet-header-main">
              <TeamFlag team={team} teamId={team.id} size="xl" />
              <div>
                <h2>{team.name}</h2>
                <p className="team-sheet-sub">
                  Group {team.group} · FIFA rank {team.fifaRank ?? "—"}
                </p>
              </div>
              <CertaintyBadge certainty={certaintyBadge} size="xs" />
            </div>
            <button type="button" onClick={close} aria-label="Close">
              ×
            </button>
          </header>
        </TeamThemeRoot>

        <div className="team-sheet-tabs">
          {(["overview", "fixtures", "stats", "betting"] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="team-sheet-body">
          {tab === "overview" ? (
            <>
              {recentForm.length > 0 ? (
                <p className="team-sheet-form">
                  Form:{" "}
                  {recentForm
                    .slice(0, 5)
                    .map((m) => {
                      const isHome = m.homeTeam.toLowerCase() === team.name.toLowerCase();
                      const ts = isHome ? m.homeScore : m.awayScore;
                      const os = isHome ? m.awayScore : m.homeScore;
                      return ts > os ? "W" : ts < os ? "L" : "D";
                    })
                    .join("")}
                </p>
              ) : null}

              {groupStanding ? (
                <table className="team-sheet-standings">
                  <thead>
                    <tr>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="team-sheet-standings-highlight">
                      <td>{groupStanding.row.played}</td>
                      <td>{groupStanding.row.wins}</td>
                      <td>{groupStanding.row.draws}</td>
                      <td>{groupStanding.row.losses}</td>
                      <td>{groupStanding.row.goalsFor}</td>
                      <td>{groupStanding.row.goalsAgainst}</td>
                      <td>{groupStanding.row.goalDifference}</td>
                      <td>
                        <strong>{groupStanding.row.points}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}

              {qual ? (
                <div className="team-sheet-qual">
                  <h3>Qualification</h3>
                  <p>
                    <strong>{qual.status.replace("_", " ").toUpperCase()}</strong>
                    {qual.certainty === "confirmed" ? " · CONFIRMED" : " · PROJECTED"}
                  </p>
                  <p>{qual.reason}</p>
                  {qual.status === "at_risk" && thirdRank >= 0 ? (
                    <p>
                      Best-third rank: {thirdRank + 1} of 12 — cut line is top 8.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "fixtures" ? (
            <ul className="team-match-history-list">
              {allFixtures.map((match) => {
                const isHome = match.homeTeamId === teamId;
                const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
                const opponent = teams[opponentId];
                const teamScore = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
                const oppScore = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
                return (
                  <li key={match.id} className="team-match-history-row">
                    <span>{match.status === "live" ? "LIVE" : match.status === "completed" ? "FT" : formatKickoffTime(match.date)}</span>
                    <span>
                      <TeamFlag team={opponent} teamId={opponentId} />{" "}
                      <span className="team-name-text">{teamDisplayName(opponent, opponentId)}</span>
                    </span>
                    <span>
                      {match.homeScore !== undefined ? `${teamScore}–${oppScore}` : "vs"}
                    </span>
                    <time dateTime={match.date}>{formatKickoffDate(match.date)}</time>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {tab === "stats" && stats ? (
            <div className="team-sheet-stats">
              <p>
                Goals {stats.gf} / Conceded {stats.ga} / GD {stats.gd >= 0 ? "+" : ""}
                {stats.gd}
              </p>
              <p>Avg goals per game: {stats.avgGoals}</p>
              <div className="team-wdl-bar" aria-label="Win draw loss breakdown">
                <span style={{ flex: stats.wdl.w }} className="team-wdl-bar--w" />
                <span style={{ flex: stats.wdl.d }} className="team-wdl-bar--d" />
                <span style={{ flex: stats.wdl.l }} className="team-wdl-bar--l" />
              </div>
              <p>
                W {stats.wdl.w} · D {stats.wdl.d} · L {stats.wdl.l}
              </p>
            </div>
          ) : null}

          {tab === "betting" ? (
            <div>
              <p>Title market: {team.titleProbability ? `${(team.titleProbability * 100).toFixed(1)}%` : "—"}</p>
              <p>ClubElo rating: {elo ?? "Loading…"}</p>
              {simulationRunning ? <p className="odds-recalc">Recalculating…</p> : null}
              <p className="odds-disclaimer">Based on simulated tournaments. For entertainment only — not financial advice.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
