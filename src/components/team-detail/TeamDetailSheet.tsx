import { useEffect, useState } from "react";
import { useStore } from "../../store";
import { getTeamElo } from "../../services/ClubEloClient";

type Tab = "now" | "path" | "odds";

export function TeamDetailSheet() {
  const open = useStore((s) => s.teamSheetOpen);
  const teamId = useStore((s) => s.activeTeamId);
  const close = useStore((s) => s.closeTeamSheet);
  const teams = useStore((s) => s.teams);
  const simulationRunning = useStore((s) => s.simulationRunning);
  const [tab, setTab] = useState<Tab>("now");
  const [elo, setElo] = useState<number | null>(null);

  const team = teamId ? teams[teamId] : null;

  useEffect(() => {
    if (!team) return;
    void getTeamElo(team.name).then(setElo);
  }, [team]);

  if (!open || !team) return null;

  return (
    <div className="team-sheet-backdrop" role="presentation" onClick={close}>
      <div
        className="team-sheet"
        role="dialog"
        aria-label={`${team.shortName} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="team-sheet-header">
          <h2>{team.name}</h2>
          <button type="button" onClick={close} aria-label="Close">
            ×
          </button>
        </header>

        <div className="team-sheet-tabs">
          {(["now", "path", "odds"] as Tab[]).map((t) => (
            <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="team-sheet-body">
          {tab === "now" ? (
            <p>
              Group {team.group} · FIFA rank {team.fifaRank ?? "—"} · Title market{" "}
              {team.titleProbability ? `${(team.titleProbability * 100).toFixed(1)}%` : "—"}
            </p>
          ) : null}
          {tab === "path" ? (
            <p>
              ClubElo rating: {elo ?? "Loading…"} · Bracket path updates with live goals.
            </p>
          ) : null}
          {tab === "odds" ? (
            <div>
              <p>Polymarket / model odds from simulation.</p>
              {simulationRunning ? <p className="odds-recalc">Recalculating…</p> : null}
              <p className="odds-stub">Sportsbook consensus: — (v2)</p>
              <p className="odds-stub">Betfair implied: — (v2)</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
