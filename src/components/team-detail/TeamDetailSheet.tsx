import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatKickoffDate, formatKickoffTime } from "../../lib/formatKickoff";
import { buildQualificationContext } from "../../lib/qualification";
import { useTeamQualificationView } from "../../store/selectors/qualificationSelectors";
import { rankAliveBestThirds } from "../../lib/bestThirds";
import { buildThirdPlaceCutoffScenario } from "../../lib/thirdPlaceCutoffScenario";
import { buildTeamHistoricalFacts } from "../../lib/teamHistoricalFacts";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { TeamDrawerTab } from "../../lib/teamDrawer";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { getTeamElo } from "../../services/ClubEloClient";
import { getHistoricalMatchesForTeam, type ZafronixMatch } from "../../services/ZafronixClient";
import { TeamThemeRoot } from "../team/TeamThemeRoot";
import { TeamFlag } from "../team/TeamFlag";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { TeamMatchLists, TeamSquadList, TeamStatsPanel } from "./TeamProfileSections";
import { Wc2026SquadList } from "./Wc2026SquadList";
import { PlayerPhoto } from "../player/PlayerPhoto";
import { useTeamProfile } from "../../hooks/useTeamProfile";
import { useWc2026TeamSquad } from "../../hooks/useWc2026TeamSquad";
import { useZafronixTeamRoster } from "../../hooks/useZafronixTeamRoster";
import { TeamBettingPanel } from "./TeamBettingPanel";
import { TeamHighlightlyPanel } from "./TeamHighlightlyPanel";
import { useHighlightlyTeamData } from "../../hooks/useHighlightlyTeamData";
import { useEliminationStory } from "../../hooks/useEliminationStory";
import { useTeamTournamentStatus } from "../../hooks/useTeamTournamentStatus";
import { KnockoutStoryCard } from "./KnockoutStoryCard";
import { TeamEliminationCard } from "./TeamEliminationCard";
import { CompactMatchScore } from "../match/CompactMatchScore";
import { advancementSectionCopy } from "../../lib/teamTournamentStatus";
import { qualCopyFromVariant } from "../../lib/appCopy";
import type { QualificationDisplay } from "../../lib/qualificationDisplay";
import { predictionsForTeam } from "../../lib/matchFootballPredictions";
import type { MergedMatch } from "../../types";

const td = APP_COPY.teamDrawer;

const TAB_LABELS: Record<TeamDrawerTab, string> = {
  overview: td.tabOverview,
  matches: td.tabMatches,
  players: td.tabPlayers,
  form: td.tabForm,
  context: td.tabContext,
  historical: td.tabHistorical,
};

export function TeamDetailSheet() {
  const open = useStore((s) => s.teamSheetOpen);
  const teamId = useStore((s) => s.activeTeamId);
  const initialTab = useStore((s) => s.teamSheetTab);
  const close = useStore((s) => s.closeTeamSheet);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const standings = useStore((s) => s.groupStandings);
  const simulationRunning = useStore((s) => s.simulationRunning);
  const [tab, setTab] = useState<TeamDrawerTab>("overview");
  const [elo, setElo] = useState<number | null>(null);
  const [recentForm, setRecentForm] = useState<ZafronixMatch[]>([]);

  const team = teamId ? resolveTeamFromStore(teams, teamId) : null;
  const teamDisplay = team ? teamDisplayName(team, team.id) : "";
  const highlightlyTeam = useHighlightlyTeamData(teamDisplay, Boolean(team));
  const { profile: sofaProfile, loading: sofaLoading } = useTeamProfile(team?.abbreviation);
  const { players: wcSquad, loading: wcSquadLoading } = useWc2026TeamSquad(team);
  const loadPlayersTab = tab === "players";
  const { players: zafronixSquad, loading: zafronixRosterLoading } = useZafronixTeamRoster(
    team,
    loadPlayersTab && wcSquad.length === 0 && !wcSquadLoading
  );
  const footballPredictionBundle = useStore((s) => s.footballPredictionBundle);
  const teamPredictions = useMemo(() => {
    if (!team || !footballPredictionBundle) return [];
    return predictionsForTeam(team, footballPredictionBundle.dailyPredictions);
  }, [team, footballPredictionBundle]);

  const qualView = useTeamQualificationView(teamId ?? "");
  const qual = qualView?.status ?? null;

  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const { story: eliminationStory } = useEliminationStory(teamId);
  const tournamentStatus = useTeamTournamentStatus(teamId ?? undefined);

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
      avgGoals: (row.goalsFor / played).toFixed(2),
    };
  }, [groupStanding]);

  const thirdRank = useMemo(() => {
    if (!teamId) return -1;
    return rankAliveBestThirds(standings, qualContext).findIndex((r) => r.teamId === teamId);
  }, [standings, teamId, qualContext]);

  const rankedThirds = useMemo(
    () => rankAliveBestThirds(standings, qualContext),
    [standings, qualContext]
  );

  const cutoffScenario = useMemo(() => {
    if (!teamId || thirdRank < 0) return null;
    return buildThirdPlaceCutoffScenario(teamId, rankedThirds, standings, qualContext);
  }, [teamId, thirdRank, rankedThirds, standings, qualContext]);

  const historical = useMemo(() => {
    if (!team) return { facts: [], hasNotable: false };
    return buildTeamHistoricalFacts(team, { managerName: sofaProfile?.details?.managerName });
  }, [team, sofaProfile]);

  const visibleTabs = useMemo((): TeamDrawerTab[] => {
    const base: TeamDrawerTab[] = ["overview", "matches", "players", "form", "context"];
    if (historical.hasNotable) base.push("historical");
    return base;
  }, [historical.hasNotable]);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, teamId]);

  useEffect(() => {
    if (!team) return;
    void getTeamElo(team.name).then(setElo);
  }, [team]);

  useEffect(() => {
    if (!team || tab !== "form") return;
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

  const qualDisplay = qualView?.display ?? null;

  const badgeDisplay: QualificationDisplay | null =
    tournamentStatus?.phase === "eliminated"
      ? (() => {
          const copy = qualCopyFromVariant("confirmed-eliminated");
          return {
            variant: "confirmed-eliminated" as const,
            label: copy.label,
            shortLabel: copy.shortLabel,
            rowClass: "qual-row--confirmed-eliminated",
            hint: tournamentStatus.hint,
          };
        })()
      : qualDisplay;

  const advancementCopy = tournamentStatus ? advancementSectionCopy(tournamentStatus) : null;

  if (!open || !team || !teamId) return null;

  const isEliminated =
    tournamentStatus?.phase === "eliminated" ||
    Boolean(qual && (!qual.canQualify || qual.lifeState === "eliminated"));

  const openFixture = (match: MergedMatch) => {
    openMatchDetail(match.id, { from: "live" });
  };

  const sheet = (
    <div className="team-sheet-backdrop team-sheet-backdrop--portal" role="presentation" onClick={close}>
      <div
        className="team-sheet team-sheet--portal"
        role="dialog"
        aria-label={`${teamDisplayName(team)} profile`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fwc-unify-stripe" aria-hidden="true" />
        <TeamThemeRoot teamId={team.id} className="team-sheet-header-themed">
          <header className="team-sheet-header">
            <div className="team-sheet-header-main">
              <TeamFlag team={team} teamId={team.id} size="xl" />
              <div>
                <h2>{team.name}</h2>
                <p className="team-sheet-sub">
                  Group {team.group} · FIFA rank {team.fifaRank ?? sofaProfile?.details?.fifaRanking ?? "—"}
                  {elo != null ? ` · Elo ${Math.round(elo)}` : null}
                  {sofaProfile?.details?.managerName
                    ? ` · Coach ${sofaProfile.details.managerName}`
                    : null}
                </p>
              </div>
              {qual ? <QualificationStatusBadge qual={qual} display={badgeDisplay ?? undefined} size="sm" /> : null}
            </div>
            <button type="button" onClick={close} aria-label="Close">
              ×
            </button>
          </header>
        </TeamThemeRoot>

        <div className="team-sheet-tabs">
          {visibleTabs.map((t) => (
            <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="team-sheet-body">
          {tab === "overview" ? (
            <>
              {tournamentStatus ? (
                <p className="team-sheet-qual-oneliner">
                  <strong>{tournamentStatus.label}</strong>
                  {tournamentStatus.hint ? ` — ${tournamentStatus.hint}` : ""}
                </p>
              ) : qualDisplay ? (
                <p className="team-sheet-qual-oneliner">
                  <strong>{qualDisplay.label}</strong> — {qualDisplay.hint}
                </p>
              ) : null}

              {groupStanding ? (
                <table className="team-sheet-standings">
                  <thead>
                    <tr>
                      <th>{APP_COPY.table.gp}</th>
                      <th>{APP_COPY.table.w}</th>
                      <th>{APP_COPY.table.d}</th>
                      <th>{APP_COPY.table.l}</th>
                      <th>{APP_COPY.table.gf}</th>
                      <th>{APP_COPY.table.ga}</th>
                      <th>{APP_COPY.table.gd}</th>
                      <th>{APP_COPY.table.pts}</th>
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

              {stats ? (
                <TeamStatsPanel groupStats={stats} sofaStats={sofaProfile?.statistics ?? null} />
              ) : null}

              {highlightlyTeam.highlights.length > 0 ? (
                <button type="button" className="team-sheet-highlights-teaser" onClick={() => setTab("overview")}>
                  {td.highlightsTeaser} ({highlightlyTeam.highlights.length})
                </button>
              ) : null}
            </>
          ) : null}

          {tab === "matches" ? (
            <>
              {allFixtures.length === 0 ? (
                <p className="team-sheet-empty">
                  {isEliminated ? td.fixturesEmptyEliminated : td.fixturesEmptyNoData}
                </p>
              ) : (
                <ul className="team-match-history-list">
                  {allFixtures.map((match) => {
                    const opponentId =
                      match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId;
                    const opponent = resolveTeamFromStore(teams, opponentId);
                    return (
                      <li key={match.id}>
                        <button
                          type="button"
                          className="team-match-history-row team-match-history-row--clickable"
                          onClick={() => openFixture(match)}
                        >
                          <span>
                            {match.status === "live"
                              ? APP_COPY.match.live
                              : match.status === "completed"
                                ? APP_COPY.match.final
                                : formatKickoffTime(match.date)}
                          </span>
                          <span>
                            <TeamFlag team={opponent} teamId={opponentId} />{" "}
                            <span className="team-name-text">
                              {teamDisplayName(opponent, opponentId)}
                            </span>
                          </span>
                          <CompactMatchScore match={match} teamId={teamId} />
                          <time dateTime={match.date}>{formatKickoffDate(match.date)}</time>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {sofaProfile ? (
                <>
                  <TeamMatchLists
                    title="Recent results (SofaScore)"
                    matches={sofaProfile.lastMatches}
                    teamName={team.name}
                  />
                  <TeamMatchLists
                    title="Upcoming (SofaScore)"
                    matches={sofaProfile.nextMatches}
                    teamName={team.name}
                  />
                </>
              ) : null}
            </>
          ) : null}

          {tab === "players" ? (
            wcSquadLoading ? (
              <p className="team-sheet-empty">Loading squad photos…</p>
            ) : wcSquad.length > 0 ? (
              <Wc2026SquadList players={wcSquad} />
            ) : zafronixRosterLoading ? (
              <p className="team-sheet-empty">Loading squad…</p>
            ) : zafronixSquad.length > 0 ? (
              <ul className="team-squad-list">
                {zafronixSquad.map((p) => (
                  <li key={p.name} className="team-squad-row">
                    <span className="team-squad-num">{p.number ?? "—"}</span>
                    <PlayerPhoto name={p.name ?? "Player"} size="lg" className="team-squad-photo" />
                    <span className="team-squad-name">
                      <strong>{p.name}</strong>
                      {p.club ? <span className="team-squad-club">{p.club}</span> : null}
                    </span>
                    <span className="team-squad-pos">{p.position ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : sofaLoading ? (
              <p className="team-sheet-empty">Loading squad…</p>
            ) : (
              <TeamSquadList players={sofaProfile?.players ?? []} />
            )
          ) : null}

          {tab === "form" ? (
            <>
              {recentForm.length > 0 ? (
                <>
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
                  <ul className="team-form-list">
                    {recentForm.map((m) => {
                      const isHome = m.homeTeam.toLowerCase() === team.name.toLowerCase();
                      const ts = isHome ? m.homeScore : m.awayScore;
                      const os = isHome ? m.awayScore : m.homeScore;
                      const result = ts > os ? "W" : ts < os ? "L" : "D";
                      const opp = isHome ? m.awayTeam : m.homeTeam;
                      return (
                        <li key={`${m.date}-${opp}`} className={`team-form-row team-form-row--${result}`}>
                          <span>{result}</span>
                          <span>
                            {ts}–{os} vs {opp}
                          </span>
                          <time dateTime={m.date}>{m.date}</time>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="team-sheet-empty">No recent form data yet.</p>
              )}
            </>
          ) : null}

          {tab === "context" ? (
            <>
              {tournamentStatus?.phase === "eliminated" ? (
                <TeamEliminationCard status={tournamentStatus} teamId={teamId} />
              ) : null}

              {eliminationStory && tournamentStatus?.phase !== "eliminated" ? (
                <KnockoutStoryCard
                  story={eliminationStory}
                  teamId={teamId}
                  onViewFixtures={() => setTab("matches")}
                />
              ) : null}

              {advancementCopy ? (
                <div
                  className={`team-sheet-qual ${
                    tournamentStatus?.phase === "eliminated"
                      ? "qual-row--confirmed-eliminated"
                      : qualDisplay?.rowClass ?? ""
                  }`}
                >
                  <h3>{advancementCopy.title}</h3>
                  <p className="team-sheet-qual-hint">{APP_COPY.knockoutStory.advancementHint}</p>
                  <p className="team-sheet-qual-label">
                    <strong>{advancementCopy.label}</strong>
                  </p>
                  <p>{advancementCopy.hint}</p>
                  {qual && tournamentStatus?.phase === "group" && qual.canQualify ? (
                    <>
                      <p>{qual.reason}</p>
                      {qual.canQualify && qual.projectionScore > 0 ? (
                        <p className="team-sheet-qual-meta">
                          Projection score: {qual.projectionScore}/100 (rule-based model, not a betting
                          probability)
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {qual?.canQualify && qual.status === "at_risk" && thirdRank >= 0 ? (
                    <p>
                      Best-third rank (alive teams): {thirdRank + 1} — cut line is top 8.
                    </p>
                  ) : null}
                  {cutoffScenario && thirdRank === 7 ? (
                    <div className="team-sheet-cutoff-summary">
                      {cutoffScenario.proseLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <TeamBettingPanel
                team={team}
                teamPredictions={teamPredictions}
                simulationRunning={simulationRunning}
              />
            </>
          ) : null}

          {tab === "historical" && historical.hasNotable ? (
            <>
              <p className="team-sheet-lead">{td.historicalLead}</p>
              <ul className="team-historical-list">
                {historical.facts.map((fact) => (
                  <li key={fact.id} className="team-historical-row">
                    <strong>{fact.label}</strong>
                    <span>{fact.detail}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {tab === "overview" && highlightlyTeam.highlights.length > 0 ? (
            <TeamHighlightlyPanel
              teamName={teamDisplay}
              highlights={highlightlyTeam.highlights}
              lastFive={highlightlyTeam.lastFive}
              seasonStats={highlightlyTeam.seasonStats}
              loading={highlightlyTeam.loading}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
