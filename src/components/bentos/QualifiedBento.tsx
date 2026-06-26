import { useMemo } from "react";
import { bucketQualificationTeams, computeQualificationStatus } from "../../lib/qualification";
import { rankBestThirds } from "../../lib/bestThirds";
import { useStore } from "../../store";
import { TeamThemeRoot } from "../team/TeamThemeRoot";

function QualTeamChip({
  teamId,
  dim,
  badge
}: {
  teamId: string;
  dim?: boolean;
  badge?: string;
}) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const team = teams[teamId];
  const label = team?.shortName ?? team?.name ?? teamId;
  const qual = computeQualificationStatus(teamId, standings);

  return (
    <div
      className={`qual-team-chip ${dim ? "qual-team-chip--dim" : ""}`}
      title={qual.reason ?? team?.name ?? label}
    >
      {badge ? <span className={`qual-team-badge qual-team-badge--${badge}`}>{badge}</span> : null}
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
  badge,
  dim
}: {
  title: string;
  hint: string;
  teamIds: string[];
  badge: string;
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
          <QualTeamChip key={id} teamId={id} dim={dim} badge={badge} />
        ))}
      </div>
    </div>
  );
}

export function QualifiedBento() {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);

  const buckets = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings),
    [teams, standings]
  );

  const hasAny = buckets.confirmedThrough.length > 0 || buckets.projectedThrough.length > 0;

  return (
    <section className="qual-bento qual-bento--qualified" aria-label="Qualified teams">
      <h3 className="qual-bento-title">Through</h3>
      <p className="qual-bento-lead">Top-two places — automatic group qualification.</p>
      {hasAny ? (
        <>
          <QualSection
            title="Confirmed"
            hint="Mathematically locked in — will advance no matter what happens in remaining matches."
            teamIds={buckets.confirmedThrough}
            badge="Locked"
          />
          <QualSection
            title="Projected"
            hint="Leading the table now, but other teams can still overtake them."
            teamIds={buckets.projectedThrough}
            badge="Leading"
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

  const buckets = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings),
    [teams, standings]
  );

  const hasAny = buckets.confirmedOut.length > 0 || buckets.projectedOut.length > 0;

  return (
    <section className="qual-bento qual-bento--eliminated" aria-label="Eliminated teams">
      <h3 className="qual-bento-title">Out</h3>
      <p className="qual-bento-lead">Teams with no realistic path to the knockout round.</p>
      {hasAny ? (
        <>
          <QualSection
            title="Confirmed out"
            hint="Cannot qualify — even maximum points from here would not be enough."
            teamIds={buckets.confirmedOut}
            badge="Out"
            dim
          />
          <QualSection
            title="Likely out"
            hint="Still playing, but must win out and need other results — not mathematically eliminated yet."
            teamIds={buckets.projectedOut}
            badge="Unlikely"
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

  const inContention = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings).inContention,
    [teams, standings]
  );

  return (
    <section className="qual-bento qual-bento--contention" aria-label="Teams still in contention">
      <h3 className="qual-bento-title">In contention</h3>
      <p className="qual-bento-lead">Third-place and best-eight-third races still open.</p>
      {inContention.length > 0 ? (
        <div className="qual-bento-crests">
          {inContention.slice(0, 12).map((id) => (
            <QualTeamChip key={id} teamId={id} badge="Live" />
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
          <QualTeamChip key={r.teamId} teamId={r.teamId} badge="3rd" />
        ))}
      </div>
    </section>
  );
}
