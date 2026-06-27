import { useMemo, useState } from "react";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { getBestThirdBubbleTeamIds } from "../../lib/thirdPlaceLiveStatus";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
import { StandingThemeRow } from "../team/StandingThemeRow";
import { TeamFlag } from "../team/TeamFlag";
import { TeamClickTarget } from "../team/TeamClickTarget";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import {
  BestThirdsBento,
  EliminatedBento,
  InContentionBento,
  QualifiedBento
} from "../bentos/QualifiedBento";
import { BestThirdTableBento } from "../bentos/BestThirdTableBento";
import { GroupTableBento } from "../bentos/GroupTableBento";
import {
  filterCompletedMatches,
  useCompletedGroupMatches,
  useUpcomingGroupMatches,
  type ResultsSortOrder
} from "../../store/selectors/historySelectors";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { TournamentInsightsPanel } from "../tournament/TournamentInsightsPanel";

export function GroupsView() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const bubbleTeamIds = useMemo(
    () => getBestThirdBubbleTeamIds(standings, qualContext),
    [standings, qualContext]
  );

  const groupsViewMode = useStore((s) => s.groupsViewMode);
  const setGroupsViewMode = useStore((s) => s.setGroupsViewMode);
  const completed = useCompletedGroupMatches();
  const upcoming = useUpcomingGroupMatches().slice(0, 20);
  const [resultsSort, setResultsSort] = useState<ResultsSortOrder>("newest");
  const [resultsTeamId, setResultsTeamId] = useState("");

  const resultTeamOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const m of completed) {
      ids.add(m.homeTeamId);
      ids.add(m.awayTeamId);
    }
    return [...ids]
      .map((id) => teams[id])
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [completed, teams]);

  const displayedResults = useMemo(
    () =>
      filterCompletedMatches(completed, {
        teamId: resultsTeamId || undefined,
        sort: resultsSort
      }),
    [completed, resultsSort, resultsTeamId]
  );

  const copy = APP_COPY.groups;

  return (
    <div className="groups-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          Twelve groups. <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      <TournamentInsightsPanel />

      <div className="groups-view-toggle" role="group" aria-label="Standings view mode">
        <button
          type="button"
          className={`groups-view-toggle-btn ${groupsViewMode === "flags" ? "active" : ""}`}
          onClick={() => setGroupsViewMode("flags")}
          aria-pressed={groupsViewMode === "flags"}
        >
          {copy.viewFlags}
        </button>
        <button
          type="button"
          className={`groups-view-toggle-btn ${groupsViewMode === "table" ? "active" : ""}`}
          onClick={() => setGroupsViewMode("table")}
          aria-pressed={groupsViewMode === "table"}
        >
          {copy.viewTable}
        </button>
      </div>

      {groupsViewMode === "flags" ? (
        <>
          <section aria-label="Qualification flags" className="dashboard-section">
            <div className="section-heading compact">
              <div>
                <div className="section-kicker">{copy.qualKicker}</div>
                <h2 className="section-title-text">{APP_COPY.qual.sectionTitle}</h2>
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
              <BentoErrorBoundary bento="BestThirdsBento">
                <BestThirdsBento />
              </BentoErrorBoundary>
            </div>
          </section>

          <section aria-label="Group standings" className="dashboard-section">
            <div className="section-heading compact">
              <div>
                <div className="section-kicker">{copy.standingsKicker}</div>
                <h2 className="section-title-text">All groups</h2>
              </div>
            </div>

            <div className="groups-grid">
              {standings.map((g) => (
                <article key={g.group} className="group-panel">
                  <header className="group-header">
                    <div>
                      <h2>Group {g.group}</h2>
                      <div className="mini-qualifiers" aria-hidden>
                        {g.rows.slice(0, 2).map((row) => {
                          const t = teams[row.teamId];
                          return t ? (
                            <TeamFlag key={row.teamId} team={t} teamId={row.teamId} size="sm" />
                          ) : null;
                        })}
                      </div>
                    </div>
                  </header>
                  <div className="standing-table-wrap">
                  <table className="standing-table">
                    <thead>
                      <tr>
                        <th>{APP_COPY.table.team}</th>
                        <th title={APP_COPY.glossary.points}>{APP_COPY.table.gamesPlayed}</th>
                        <th title={APP_COPY.glossary.goalDiff}>{APP_COPY.table.goalDiff}</th>
                        <th title={APP_COPY.glossary.points}>{APP_COPY.table.points}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((row, i) => {
                        const team = teams[row.teamId];
                        const qual = computeQualificationStatus(row.teamId, standings, qualContext);
                        const display = resolveQualificationDisplay(qual);
                        return (
                          <StandingThemeRow
                            key={row.teamId}
                            teamId={row.teamId}
                            accentAnimated={bubbleTeamIds.has(row.teamId)}
                            className={display.rowClass}
                          >
                            <td>
                              <span className="rank">{i + 1}</span>
                              <QualificationStatusBadge qual={qual} size="xs" />
                              <TeamFlag team={team} teamId={row.teamId} size="sm" />
                              <TeamClickTarget teamId={row.teamId} className="group-standing-team-btn">
                                <strong className="team-name-text">{teamDisplayNameFromId(row.teamId, teams)}</strong>
                              </TeamClickTarget>
                            </td>
                            <td>{row.played}</td>
                            <td>
                              {row.goalDifference >= 0 ? "+" : ""}
                              {row.goalDifference}
                            </td>
                            <td>
                              <b>{row.points}</b>
                            </td>
                          </StandingThemeRow>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section aria-label="Group tables" className="dashboard-section">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">{copy.standingsKicker}</div>
              <h2 className="section-title-text">Full tables</h2>
            </div>
          </div>
          <div className="groups-table-grid">
            {standings.map((g) => (
              <GroupTableBento key={g.group} standing={g} />
            ))}
          </div>
          <BestThirdTableBento standings={standings} />
        </section>
      )}

      <section aria-label="Recent results" className="dashboard-section">
        <div className="section-heading compact results-heading">
          <div>
            <div className="section-kicker">{copy.resultsKicker}</div>
            <h2 className="section-title-text">Latest scores</h2>
          </div>
          <div className="results-controls">
            <label className="results-control">
              <span className="results-control-label">Team</span>
              <select
                value={resultsTeamId}
                onChange={(e) => setResultsTeamId(e.target.value)}
                aria-label="Filter results by team"
              >
                <option value="">All teams</option>
                {resultTeamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="results-sort-btn"
              onClick={() => setResultsSort((s) => (s === "newest" ? "oldest" : "newest"))}
              aria-label={resultsSort === "newest" ? "Sort oldest first" : "Sort newest first"}
            >
              {resultsSort === "newest" ? "Newest first" : "Oldest first"}
            </button>
          </div>
        </div>
        <div className="schedule-list schedule-list--compact">
          {displayedResults.map((m) => (
            <MatchScheduleCard
              key={m.id}
              match={m}
              home={teams[m.homeTeamId]}
              away={teams[m.awayTeamId]}
              compact
            />
          ))}
          {displayedResults.length === 0 ? (
            <p className="view-note">{copy.noResults}</p>
          ) : null}
        </div>
      </section>

      <section aria-label="Upcoming matches" className="dashboard-section">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">{copy.fixturesKicker}</div>
            <h2 className="section-title-text">Coming up</h2>
          </div>
        </div>
        <div className="schedule-list">
          {upcoming.map((m) => (
            <MatchScheduleCard
              key={m.id}
              match={m}
              home={teams[m.homeTeamId]}
              away={teams[m.awayTeamId]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
