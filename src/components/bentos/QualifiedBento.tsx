import { useMemo } from "react";
import { buildQualificationContext } from "../../lib/qualification";
import { rankAliveBestThirds } from "../../lib/bestThirds";
import { resolveTeamForDisplay } from "../../data/wc2026TeamCatalog";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useQualificationSnapshot, useTeamQualificationView } from "../../store/selectors/qualificationSelectors";
import { useStore } from "../../store";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { TeamFlag } from "../team/TeamFlag";
import { TeamClickTarget } from "../team/TeamClickTarget";
import type { OpenTeamSheetOptions } from "../../lib/teamDrawer";

function thirdRankHint(bestThirdRank?: number): string | undefined {
  if (bestThirdRank === undefined) return undefined;
  const td = APP_COPY.teamDrawer;
  if (bestThirdRank === 8) return td.thirdRankCutoff;
  if (bestThirdRank >= 7 && bestThirdRank <= 10) return td.thirdRankBubble(bestThirdRank);
  if (bestThirdRank > 8) return td.thirdRankOutside(bestThirdRank);
  return undefined;
}

function QualTeamChip({
  teamId,
  dim,
  sheetOptions,
}: {
  teamId: string;
  dim?: boolean;
  sheetOptions?: OpenTeamSheetOptions;
}) {
  const teams = useStore((s) => s.teams);
  const view = useTeamQualificationView(teamId);
  const team = teams[teamId] ?? resolveTeamForDisplay(teamId);
  const label = teamDisplayNameFromId(teamId, teams);
  const rankHint = thirdRankHint(view?.bestThirdRank);
  const title = [view?.status.reason ?? team?.name ?? label, rankHint].filter(Boolean).join(" · ");

  if (!view) return null;

  return (
    <TeamClickTarget
      teamId={teamId}
      className={`qual-team-chip ${dim ? "qual-team-chip--dim" : ""}`}
      options={sheetOptions}
      title={title}
    >
      <QualificationStatusBadge qual={view.status} display={view.display} size="xs" />
      <TeamFlag team={team} teamId={teamId} size="sm" dim={dim} />
      <span className="qual-team-name team-name-text">{label}</span>
      {rankHint ? <span className="qual-team-rank-hint">{rankHint}</span> : null}
    </TeamClickTarget>
  );
}

function QualSection({
  title,
  hint,
  teamIds,
  dim,
  sheetOptions,
}: {
  title: string;
  hint: string;
  teamIds: string[];
  dim?: boolean;
  sheetOptions?: OpenTeamSheetOptions;
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
          <QualTeamChip key={id} teamId={id} dim={dim} sheetOptions={sheetOptions} />
        ))}
      </div>
    </div>
  );
}

export function QualifiedBento() {
  const { layout } = useQualificationSnapshot();
  const q = APP_COPY.qual;
  const hasAny = layout.movingOn.confirmed.length > 0 || layout.movingOn.projected.length > 0;

  return (
    <section className="qual-bento qual-bento--qualified" aria-label={APP_COPY.aria.qualifiedTeams}>
      <h3 className="qual-bento-title">{q.qualifiedTitle}</h3>
      <p className="qual-bento-lead">{q.qualifiedLead}</p>
      {hasAny ? (
        <>
          <QualSection
            title={q.confirmedQualifiedSection}
            hint={q.confirmedQualifiedHint}
            teamIds={layout.movingOn.confirmed}
          />
          <QualSection
            title={q.projectedQualifiedSection}
            hint={q.projectedQualifiedHint}
            teamIds={layout.movingOn.projected}
          />
        </>
      ) : (
        <p className="qual-bento-empty">{q.noQualified}</p>
      )}
    </section>
  );
}

export function EliminatedBento() {
  const { layout } = useQualificationSnapshot();
  const q = APP_COPY.qual;
  const contextTab = { tab: "context" as const };
  const hasAny = layout.out.confirmed.length > 0;

  return (
    <section className="qual-bento qual-bento--eliminated" aria-label={APP_COPY.aria.eliminatedTeams}>
      <h3 className="qual-bento-title">{q.eliminatedTitle}</h3>
      <p className="qual-bento-lead">{q.eliminatedLead}</p>
      {hasAny ? (
        <QualSection
          title={q.confirmedEliminatedSection}
          hint={q.confirmedEliminatedHint}
          teamIds={layout.out.confirmed}
          dim
          sheetOptions={contextTab}
        />
      ) : (
        <p className="qual-bento-empty">{q.noEliminated}</p>
      )}
    </section>
  );
}

export function InContentionBento() {
  const { layout } = useQualificationSnapshot();
  const q = APP_COPY.qual;
  const { alive, projectedOut } = layout.inContention;
  const hasAny = alive.length > 0 || projectedOut.length > 0;

  return (
    <section className="qual-bento qual-bento--contention" aria-label={APP_COPY.aria.contentionTeams}>
      <h3 className="qual-bento-title">{q.contentionTitle}</h3>
      <p className="qual-bento-lead">{q.contentionLead}</p>
      {hasAny ? (
        <>
          <QualSection
            title={q.contentionAliveSection}
            hint={q.contentionAliveHint}
            teamIds={alive}
            sheetOptions={{ tab: "context" }}
          />
          <QualSection
            title={q.contentionProjectedOutSection}
            hint={q.contentionProjectedOutHint}
            teamIds={projectedOut}
            sheetOptions={{ tab: "context" }}
          />
        </>
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
          <QualTeamChip key={r.teamId} teamId={r.teamId} sheetOptions={{ tab: "context" }} />
        ))}
      </div>
    </section>
  );
}
