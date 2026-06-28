import { useState } from "react";
import { resolveTeamFromStore } from "../../data/wc2026TeamCatalog";
import type { MergedMatch } from "../../types";
import { useMatchEnrichment } from "../../hooks/useMatchEnrichment";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";

type Props = {
  match: MergedMatch;
  wcMatchId?: string | number;
  onClose: () => void;
};

type DetailTab = "commentary" | "lineups" | "stats";

export function MatchDetailPanel({ match, wcMatchId, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>("commentary");
  const { commentary, lineups, statistics, loading } = useMatchEnrichment(match.id);
  const teams = useStore((s) => s.teams);

  const homeTeam = teamDisplayName(undefined, match.homeTeamId, teams);
  const awayTeam = teamDisplayName(undefined, match.awayTeamId, teams);
  const home = resolveTeamFromStore(teams, match.homeTeamId);
  const away = resolveTeamFromStore(teams, match.awayTeamId);

  return (
    <div className="match-detail-backdrop" role="presentation" onClick={onClose}>
      <div
        className="match-detail-panel"
        role="dialog"
        aria-label="Match detail"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="match-detail-header">
          <h2 className="match-detail-title">
            <span className="match-detail-team" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <TeamFlag team={home} teamId={match.homeTeamId} size="sm" compact />
              {homeTeam}
            </span>{" "}
            {match.homeScore ?? "–"} : {match.awayScore ?? "–"}{" "}
            <span className="match-detail-team" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <TeamFlag team={away} teamId={match.awayTeamId} size="sm" compact />
              {awayTeam}
            </span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="match-detail-close">
            ×
          </button>
        </header>

        {wcMatchId ? (
          <>
            <div className="match-detail-tabs">
              {(["commentary", "lineups", "stats"] as DetailTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="match-detail-body">
              {loading ? (
                <p className="match-detail-loading">Loading…</p>
              ) : (
                <>
                  {tab === "commentary" ? (
                    <ul className="match-commentary-list">
                      {commentary.length === 0 ? (
                        <li className="match-commentary-empty">No commentary available</li>
                      ) : (
                        commentary.map((entry, i) => (
                          <li key={i} className="match-commentary-entry">
                            <span className="commentary-minute">{entry.minute}'</span>
                            <span className="commentary-text">{entry.text}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}

                  {tab === "lineups" ? (
                    <div className="match-lineups">
                      {lineups.length === 0 ? (
                        <p>Lineups not available</p>
                      ) : (
                        <div className="lineups-grid">
                          {lineups.map((lineup) => (
                            <div key={lineup.team} className="lineup-col">
                              <h3>{lineup.team === "home" ? homeTeam : awayTeam}</h3>
                              <ul>
                                {lineup.startingXI.map((p, i) => (
                                  <li key={i}>
                                    {p.player.jerseyNumber ? `${p.player.jerseyNumber}. ` : ""}
                                    {p.player.displayName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {tab === "stats" ? (
                    <div className="match-stats">
                      {!statistics ? (
                        <p>Stats not available</p>
                      ) : (
                        <table className="stats-table">
                          <thead>
                            <tr>
                              <th>{homeTeam}</th>
                              <th>Stat</th>
                              <th>{awayTeam}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(statistics.home).map(([key, homeVal]) => (
                              <tr key={key}>
                                <td>{homeVal}</td>
                                <td className="stat-label">{key}</td>
                                <td>{statistics.away[key as keyof typeof statistics.away]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        ) : (
          <p className="match-detail-no-wc">Live detail not available for this match.</p>
        )}
      </div>
    </div>
  );
}
