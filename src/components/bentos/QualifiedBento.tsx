import { useMemo } from "react";
import { computeQualificationStatus } from "../../lib/qualification";
import { rankBestThirds } from "../../lib/bestThirds";
import { useStore } from "../../store";
import { TeamThemeRoot } from "../team/TeamThemeRoot";

function QualCrest({ teamId, dim }: { teamId: string; dim?: boolean }) {
  const teams = useStore((s) => s.teams);
  const team = teams[teamId];
  if (!team?.logo) return null;

  return (
    <TeamThemeRoot teamId={teamId} className="qual-crest-wrap">
      <img
        src={team.logo}
        alt={team.shortName ?? teamId}
        className={`qual-crest qual-crest-themed ${dim ? "qual-crest--dim" : ""}`}
        width={32}
        height={32}
      />
    </TeamThemeRoot>
  );
}

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
          <QualCrest key={id} teamId={id} />
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
          <QualCrest key={id} teamId={id} dim />
        ))}
      </div>
    </section>
  );
}

export function BestThirdsBento() {
  const standings = useStore((s) => s.groupStandings);
  const best = rankBestThirds(standings).slice(0, 8);

  return (
    <section className="qual-bento qual-bento--thirds" aria-label="Best third place teams">
      <h3 className="qual-bento-title">Best 3rd</h3>
      <div className="qual-bento-crests">
        {best.map((r) => (
          <QualCrest key={r.teamId} teamId={r.teamId} />
        ))}
      </div>
    </section>
  );
}
