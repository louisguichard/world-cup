import { useMemo } from "react";
import { bucketQualificationTeams, buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { rankAliveBestThirds } from "../../lib/bestThirds";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { TeamFlag } from "../team/TeamFlag";

function QualTeamChip({ teamId, dim }: { teamId: string; dim?: boolean }) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const team = teams[teamId];
  const label = teamDisplayName(team, teamId);
  const qual = computeQualificationStatus(teamId, standings, qualContext);

  return (
    <div className={`qual-team-chip ${dim ? "qual-team-chip--dim" : ""}`} title={qual.reason ?? team?.name ?? label}>
      <QualificationStatusBadge qual={qual} size="xs" />
      <TeamFlag team={team} teamId={teamId} size="lg" dim={dim} />
      <span className="qual-team-name team-name-text">{label}</span>
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

  const q = APP_COPY.qual;

  return (
    <section className="qual-bento qual-bento--qualified" aria-label="Qualified teams">
      <h3 className="qual-bento-title">{q.qualifiedTitle}</h3>
      <p className="qual-bento-lead">{q.qualifiedLead}</p>
      {hasAny ? (
        <>
          <QualSection
            title={q.confirmedQualifiedSection}
            hint={q.confirmedQualifiedHint}
            teamIds={buckets.confirmedThrough}
          />
          <QualSection
            title={q.projectedQualifiedSection}
            hint={q.projectedQualifiedHint}
            teamIds={buckets.projectedThrough}
          />
        </>
      ) : (
        <p className="qual-bento-empty">{q.noQualified}</p>
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

  const q = APP_COPY.qual;

  return (
    <section className="qual-bento qual-bento--eliminated" aria-label="Eliminated teams">
      <h3 className="qual-bento-title">{q.eliminatedTitle}</h3>
      <p className="qual-bento-lead">{q.eliminatedLead}</p>
      {hasAny ? (
        <>
          <QualSection
            title={q.confirmedEliminatedSection}
            hint={q.confirmedEliminatedHint}
            teamIds={buckets.confirmedOut}
            dim
          />
          <QualSection
            title={q.projectedEliminatedSection}
            hint={q.projectedEliminatedHint}
            teamIds={buckets.projectedOut}
            dim
          />
        </>
      ) : (
        <p className="qual-bento-empty">{q.noEliminated}</p>
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

  const q = APP_COPY.qual;

  return (
    <section className="qual-bento qual-bento--contention" aria-label="Teams still in contention">
      <h3 className="qual-bento-title">{q.contentionTitle}</h3>
      <p className="qual-bento-lead">{q.contentionLead}</p>
      {inContention.length > 0 ? (
        <div className="qual-bento-crests">
          {inContention.slice(0, 12).map((id) => (
            <QualTeamChip key={id} teamId={id} />
          ))}
        </div>
      ) : (
        <p className="qual-bento-empty">{q.noContention}</p>
      )}
    </section>
  );
}

export function BestThirdsBento() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const bt = APP_COPY.bestThird;
  const best = rankAliveBestThirds(standings, qualContext).slice(0, 8);

  return (
    <section className="qual-bento qual-bento--thirds" aria-label={bt.title}>
      <h3 className="qual-bento-title">{bt.title}</h3>
      <p className="qual-bento-lead">{bt.subtitle}</p>
      <div className="qual-bento-crests">
        {best.map((r) => (
          <QualTeamChip key={r.teamId} teamId={r.teamId} />
        ))}
      </div>
    </section>
  );
}
