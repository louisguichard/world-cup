import { useMemo } from "react";
import { bucketQualificationTeams, buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { rankBestThirds } from "../../lib/bestThirds";
import { useStore } from "../../store";
import type { QualificationCertainty } from "../../types";
import { CertaintyBadge, type CertaintyBadgeVariant } from "../shared/CertaintyBadge";
import { TeamThemeRoot } from "../team/TeamThemeRoot";

function toBadgeCertainty(certainty: QualificationCertainty): CertaintyBadgeVariant {
  if (certainty === "confirmed") return "confirmed";
  if (certainty === "projected_strong") return "projected_strong";
  if (certainty === "projected_weak") return "projected_weak";
  return "projected";
}

function QualTeamChip({ teamId, dim }: { teamId: string; dim?: boolean }) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const team = teams[teamId];
  const label = team?.shortName ?? team?.name ?? teamId;
  const qual = computeQualificationStatus(teamId, standings, qualContext);

  return (
    <div className={`qual-team-chip ${dim ? "qual-team-chip--dim" : ""}`} title={qual.reason ?? team?.name ?? label}>
      <CertaintyBadge certainty={toBadgeCertainty(qual.certainty)} size="xs" />
      {team?.logo ? (
        <TeamThemeRoot teamId={teamId} className="qual-crest-wrap">
          <img
            src={team.logo}
            alt=""
            className={`qual-crest qual-crest-themed ${dim ? "qual-crest--dim" : ""}`}
            width={32}
            height={32}
          />
        </TeamThemeRoot>
      ) : (
        <span className="qual-team-fallback" aria-hidden>
          {label.slice(0, 3).toUpperCase()}
        </span>
      )}
      <span className="qual-team-name">{label}</span>
    </div>
  );
}

function QualSection({
  title,
  hint,
  teamIds,
  dim
}: {
  title: string;
  hint: string;
  teamIds: string[];
  dim?: boolean;
}) {
  if (teamIds.length === 0) return null;

  return (
    <div className="qual-bento-section">
      <div className="qual-bento-section-head">
        <h4 className="qual-bento-subtitle">{title}</h4>
        <p className="qual-bento-hint">{hint}</p>
      </div>
      <div className="qual-bento-crests">
        {teamIds.map((id) => (
          <QualTeamChip key={id} teamId={id} dim={dim} />
        ))}
      </div>
    </div>
  );
}

export function QualifiedBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const buckets = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings, qualContext),
    [teams, standings, qualContext]
  );

  const hasAny = buckets.confirmedThrough.length > 0 || buckets.projectedThrough.length > 0;

  return (
    <section className="qual-bento qual-bento--qualified" aria-label="Qualified teams">
      <h3 className="qual-bento-title">Through</h3>
      <p className="qual-bento-lead">Top-two places — automatic group qualification.</p>
      {hasAny ? (
        <>
          <QualSection
            title="Through"
            hint="Mathematically locked in — group stage complete and final rank is top two."
            teamIds={buckets.confirmedThrough}
          />
          <QualSection
            title="Projected Through"
            hint="Currently in the top two, but group stage is not fully complete or position may still change."
            teamIds={buckets.projectedThrough}
          />
        </>
      ) : (
        <p className="qual-bento-empty">No teams in the top two yet.</p>
      )}
    </section>
  );
}

export function EliminatedBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const buckets = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings, qualContext),
    [teams, standings, qualContext]
  );

  const hasAny = buckets.confirmedOut.length > 0 || buckets.projectedOut.length > 0;

  return (
    <section className="qual-bento qual-bento--eliminated" aria-label="Eliminated teams">
      <h3 className="qual-bento-title">Out</h3>
      <p className="qual-bento-lead">Teams with no realistic path to the knockout round.</p>
      {hasAny ? (
        <>
          <QualSection
            title="Mathematically out"
            hint="Cannot qualify — even maximum points from here would not be enough."
            teamIds={buckets.confirmedOut}
            dim
          />
          <QualSection
            title="Likely Out"
            hint="Still playing, but must win out and need other results — not mathematically eliminated yet."
            teamIds={buckets.projectedOut}
            dim
          />
        </>
      ) : (
        <p className="qual-bento-empty">No teams mathematically eliminated yet.</p>
      )}
    </section>
  );
}

export function InContentionBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const inContention = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings, qualContext).inContention,
    [teams, standings, qualContext]
  );

  return (
    <section className="qual-bento qual-bento--contention" aria-label="Teams still in contention">
      <h3 className="qual-bento-title">In contention</h3>
      <p className="qual-bento-lead">Third-place and best-eight-third races still open.</p>
      {inContention.length > 0 ? (
        <div className="qual-bento-crests">
          {inContention.slice(0, 12).map((id) => (
            <QualTeamChip key={id} teamId={id} />
          ))}
        </div>
      ) : (
        <p className="qual-bento-empty">No teams on the bubble right now.</p>
      )}
    </section>
  );
}

export function BestThirdsBento() {
  const standings = useStore((s) => s.groupStandings);
  const best = rankBestThirds(standings).slice(0, 8);

  return (
    <section className="qual-bento qual-bento--thirds" aria-label="Best third place teams">
      <h3 className="qual-bento-title">Best 3rd</h3>
      <p className="qual-bento-lead">Projected top eight third-placed teams (not final until all groups finish).</p>
      <div className="qual-bento-crests">
        {best.map((r) => (
          <QualTeamChip key={r.teamId} teamId={r.teamId} />
        ))}
      </div>
    </section>
  );
}
