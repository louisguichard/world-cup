import { useMemo } from "react";
import { buildDataHealthReport } from "../../lib/dataHealth";
import { useStore } from "../../store";

export function UiDebugDataHealth() {
  const teams = useStore((s) => s.teams);
  const groupStandings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);
  const dataWarnings = useStore((s) => s.dataWarnings);

  const report = useMemo(
    () => buildDataHealthReport({ teams, groupStandings, liveMatches, dataWarnings }),
    [teams, groupStandings, liveMatches, dataWarnings]
  );

  const errors = report.issues.filter((issue) => issue.severity === "error");
  const warnings = report.issues.filter((issue) => issue.severity === "warn");

  return (
    <div className="ui-debug-panel-section">
      <span className="ui-debug-panel-label">Data health</span>
      <div className="ui-debug-data-health-grid">
        <span>Teams</span>
        <span>
          {report.teams.catalogIds} catalog · {report.teams.numericOnlyKeys} ESPN ids
        </span>
        <span>Standings</span>
        <span>
          {report.standings.groups} groups · score {report.standings.statScore}
          {report.standings.hasLiveStats ? " · live stats" : ""}
        </span>
        <span>Matches</span>
        <span>
          {report.matches.linkedToSchedule}/{report.matches.total} schedule-linked
        </span>
      </div>
      {errors.length > 0 ? (
        <ul className="ui-debug-data-health-list ui-debug-data-health-list--error">
          {errors.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="ui-debug-data-health-list ui-debug-data-health-list--warn">
          {warnings.map((issue) => (
            <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      {errors.length === 0 && warnings.length === 0 ? (
        <span className="ui-debug-panel-hint">No data integrity issues detected.</span>
      ) : null}
    </div>
  );
}
