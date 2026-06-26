import { useEffect, useMemo, useState } from "react";
import { auditFalseConfirmations, buildQualificationContext } from "../../lib/qualification";
import {
  BestThirdsBento,
  EliminatedBento,
  InContentionBento,
  QualifiedBento
} from "../bentos/QualifiedBento";
import { BestThirdTableBento } from "../bentos/BestThirdTableBento";
import { GroupTableBento } from "../bentos/GroupTableBento";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { StandingThemeRow } from "../team/StandingThemeRow";
import { TeamThemeRoot } from "../team/TeamThemeRoot";
import { useStore } from "../../store";
import {
  filterCompletedMatches,
  useCompletedGroupMatches,
  useUpcomingGroupMatches,
  type ResultsSortOrder
} from "../../store/selectors/historySelectors";

export function GroupsView() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  useEffect(() => {
    if (!import.meta.env.DEV || standings.length === 0) return;
    const falsePositives = auditFalseConfirmations(standings, qualContext);
    if (falsePositives.length === 0) return;
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/0b0b0b0b-0000-4000-8000-000000000001", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "02b5af" },
      body: JSON.stringify({
        sessionId: "02b5af",
        location: "GroupsView.tsx:audit",
        message: "false confirmation audit",
        data: { falsePositives },
        timestamp: Date.now(),
        hypothesisId: "H-audit-sweep"
      })
    }).catch(() => {});
    // #endregion
  }, [standings, qualContext]);

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

  return (
    <div className="groups-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">Group stage</div>
        <h1>
          Twelve groups. <span className="accent">Forty-eight teams.</span>
        </h1>
        <p>Live tables color-coded by qualification — green through, yellow in contention, red out.</p>
      </section>

      <div className="groups-view-toggle" role="group" aria-label="Standings view mode">
        <button
          type="button"
          className={`groups-view-toggle-btn ${groupsViewMode === "flags" ? "active" : ""}`}
          onClick={() => setGroupsViewMode("flags")}
          aria-pressed={groupsViewMode === "flags"}
        >
          Flags
        </button>
        <button
          type="button"
          className={`groups-view-toggle-btn ${groupsViewMode === "table" ? "active" : ""}`}
          onClick={() => setGroupsViewMode("table")}
          aria-pressed={groupsViewMode === "table"}
        >
          Table
        </button>
      </div>

      {groupsViewMode === "flags" ? (
        <>
          <section aria-label="Qualification flags" className="dashboard-section">
            <div className="section-heading compact">
              <div>
                <div className="section-kicker">Qualification</div>
                <h2 className="section-title-text">Who&apos;s through</h2>
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
                <div className="section-kicker">Standings</div>
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
                          return t?.logo ? (
                            <TeamThemeRoot key={row.teamId} teamId={row.teamId} className="qual-crest-wrap">
                              <img
                                src={t.logo}
                                alt=""
                                className="qual-crest qual-crest-themed"
                                width={20}
                                height={20}
                              />
                            </TeamThemeRoot>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </header>
                  <table className="standing-table">
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>MP</th>
                        <th>GD</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((row, i) => {
                        const team = teams[row.teamId];
                        const qual = computeQualificationStatus(row.teamId, standings, qualContext);
                        const rowClass =
                          i < 2 ? "qualified" : i === 2 ? "at-risk" : i === 3 ? "eliminated" : "";
                        const showBadge = i < 2;
                        return (
                          <StandingThemeRow key={row.teamId} teamId={row.teamId} className={rowClass}>
                            <td>
                              <span className="rank">{i + 1}</span>
                              {showBadge ? (
                                <CertaintyBadge
                                  certainty={qual.certainty === "confirmed" ? "confirmed" : "projected"}
                                  size="xs"
                                />
                              ) : null}
                              {team?.logo ? <img src={team.logo} alt="" width={20} height={20} /> : null}
                              <strong>{team?.shortName ?? row.teamId}</strong>
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
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section aria-label="Group tables" className="dashboard-section">
          <div className="section-heading compact">
            <div>
              <div className="section-kicker">Standings</div>
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
            <div className="section-kicker">Results</div>
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
            <p className="view-note">No completed group matches match this filter.</p>
          ) : null}
        </div>
      </section>

      <section aria-label="Upcoming matches" className="dashboard-section">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Fixtures</div>
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
