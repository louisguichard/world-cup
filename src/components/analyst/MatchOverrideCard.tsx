import { useStore } from "../../store";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function MatchOverrideCard({ matchId, homeTeam, awayTeam }: Props) {
  const override = useStore((s) => s.overrides.find((o) => o.matchId === matchId));
  const addOverride = useStore((s) => s.addOverride);
  const removeOverride = useStore((s) => s.removeOverride);

  const applied = Boolean(override);

  function applyOutcome(homeScore: number, awayScore: number) {
    addOverride({ matchId, homeScore, awayScore });
  }

  return (
    <article
      className={`match-override-card${applied ? " match-override-card--applied" : ""}`}
      data-testid={`match-override-${matchId}`}
    >
      <header className="match-override-card__header">
        <span>{homeTeam}</span>
        <span className="match-override-card__vs">vs</span>
        <span>{awayTeam}</span>
      </header>
      <div className="match-override-card__controls" role="group" aria-label="Match outcome">
        <button type="button" onClick={() => applyOutcome(1, 0)}>
          H
        </button>
        <button type="button" onClick={() => applyOutcome(0, 0)}>
          D
        </button>
        <button type="button" onClick={() => applyOutcome(0, 1)}>
          A
        </button>
      </div>
      <div className="match-override-card__score">
        <label>
          Home
          <input
            type="number"
            min={0}
            value={override?.homeScore ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number(e.target.value);
              applyOutcome(v, override?.awayScore ?? 0);
            }}
          />
        </label>
        <label>
          Away
          <input
            type="number"
            min={0}
            value={override?.awayScore ?? ""}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number(e.target.value);
              applyOutcome(override?.homeScore ?? 0, v);
            }}
          />
        </label>
      </div>
      {applied ? (
        <button type="button" className="btn-ghost btn-sm" onClick={() => removeOverride(matchId)}>
          Clear override
        </button>
      ) : null}
    </article>
  );
}
