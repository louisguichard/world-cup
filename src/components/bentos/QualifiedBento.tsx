import { useMemo } from "react";
import { computeQualificationStatus } from "../../lib/qualification";
import { rankBestThirds } from "../../lib/bestThirds";
import { useStore } from "../../store";

export function QualifiedBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);

  const qualified = useMemo(
    () =>
      Object.keys(teams).filter(
        (id) => computeQualificationStatus(id, standings, 3).status === "qualified"
      ),
    [teams, standings]
  );

  return (
    <section className="qual-bento qual-bento--qualified" aria-label="Qualified teams">
      <h3 className="qual-bento-title">Qualified</h3>
      <div className="qual-bento-crests">
        {qualified.slice(0, 12).map((id) => (
          <img
            key={id}
            src={teams[id]?.logo}
            alt={teams[id]?.shortName ?? id}
            className="qual-crest"
            width={32}
            height={32}
          />
        ))}
      </div>
    </section>
  );
}

export function EliminatedBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);

  const eliminated = useMemo(
    () =>
      Object.keys(teams).filter(
        (id) => computeQualificationStatus(id, standings, 3).status === "eliminated"
      ),
    [teams, standings]
  );

  return (
    <section className="qual-bento qual-bento--eliminated" aria-label="Eliminated teams">
      <h3 className="qual-bento-title">Eliminated</h3>
      <div className="qual-bento-crests">
        {eliminated.slice(0, 12).map((id) => (
          <img
            key={id}
            src={teams[id]?.logo}
            alt={teams[id]?.shortName ?? id}
            className="qual-crest qual-crest--dim"
            width={32}
            height={32}
          />
        ))}
      </div>
    </section>
  );
}

export function BestThirdsBento() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const best = rankBestThirds(standings).slice(0, 8);

  return (
    <section className="qual-bento qual-bento--thirds" aria-label="Best third place teams">
      <h3 className="qual-bento-title">Best 3rd</h3>
      <div className="qual-bento-crests">
        {best.map((r) => (
          <img
            key={r.teamId}
            src={teams[r.teamId]?.logo}
            alt={teams[r.teamId]?.shortName}
            className="qual-crest"
            width={32}
            height={32}
          />
        ))}
      </div>
    </section>
  );
}
