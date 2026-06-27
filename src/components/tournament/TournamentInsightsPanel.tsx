import { useTournamentProfile } from "../../hooks/useTournamentProfile";

export function TournamentInsightsPanel() {
  const profile = useTournamentProfile();
  if (!profile) return null;

  return (
    <section className="fp-insights-panel sofa-tournament-panel" aria-label="SofaScore tournament data">
      <header className="fp-insights-header">
        <h3>{profile.name ?? "FIFA World Cup"} · SofaScore</h3>
        <p className="fp-insights-meta">
          Cached {new Date(profile.fetchedAt).toLocaleDateString()}
          {profile.cupTreeNames.length > 0 ? ` · ${profile.cupTreeNames.join(", ")}` : ""}
        </p>
      </header>

      {profile.topTeams.length > 0 ? (
        <div className="sofa-top-teams">
          <h4>Top rated teams</h4>
          <ul className="fp-picks-list">
            {profile.topTeams.slice(0, 6).map((t) => (
              <li key={t.name} className="fp-pick-row">
                <span>{t.name}</span>
                <span>{t.rating.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {profile.topPlayers.length > 0 ? (
        <div className="sofa-top-players">
          <h4>Top players</h4>
          <ul className="fp-picks-list">
            {profile.topPlayers.slice(0, 5).map((p) => (
              <li key={`${p.name}-${p.team}`} className="fp-pick-row">
                <span>
                  {p.name} <span className="fp-insights-note">({p.team})</span>
                </span>
                <span>{p.rating.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {profile.standingsGroups.length > 0 ? (
        <details className="sofa-standings-details">
          <summary>SofaScore group standings ({profile.standingsGroups.length} tables)</summary>
          <div className="sofa-standings-grid">
            {profile.standingsGroups.slice(0, 4).map((g) => (
              <div key={g.id} className="sofa-standings-group">
                <h5>{g.name}</h5>
                <ol>
                  {g.rows.slice(0, 4).map((r) => (
                    <li key={r.teamName}>
                      {r.position}. {r.teamName} — {r.points} pts
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
