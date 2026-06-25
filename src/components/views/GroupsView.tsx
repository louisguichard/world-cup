import { MatchScheduleCard } from "../match/MatchScheduleCard";
import { useStore } from "../../store";
import { useCompletedGroupMatches, useUpcomingGroupMatches } from "../../store/selectors/historySelectors";

export function GroupsView() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const completed = useCompletedGroupMatches();
  const upcoming = useUpcomingGroupMatches().slice(0, 20);

  return (
    <div className="groups-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">Group stage</div>
        <h1>
          Twelve groups. <span className="accent">Forty-eight teams.</span>
        </h1>
        <p>Live tables color-coded by qualification — green through, yellow in contention, red out.</p>
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
                      return t?.logo ? <img key={row.teamId} src={t.logo} alt="" /> : null;
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
                    const rowClass =
                      i < 2 ? "qualified" : i === 2 ? "at-risk" : i === 3 ? "eliminated" : "";
                    return (
                      <tr key={row.teamId} className={rowClass}>
                        <td>
                          <span className="rank">{i + 1}</span>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Recent results" className="dashboard-section">
        <div className="section-heading compact">
          <div>
            <div className="section-kicker">Results</div>
            <h2 className="section-title-text">Latest scores</h2>
          </div>
        </div>
        <div className="schedule-list schedule-list--compact">
          {completed.slice(-8).map((m) => (
            <MatchScheduleCard
              key={m.id}
              match={m}
              home={teams[m.homeTeamId]}
              away={teams[m.awayTeamId]}
              compact
            />
          ))}
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
