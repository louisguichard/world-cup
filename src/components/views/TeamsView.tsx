import { useMemo, useState, type CSSProperties } from "react";
import { buildQualificationContext } from "../../lib/qualification";
import { useQualificationSnapshot, useTeamQualificationView } from "../../store/selectors/qualificationSelectors";
import { getBestThirdBubbleTeamIds } from "../../lib/thirdPlaceLiveStatus";
import { teamDisplayNameFromId, resolveTeamFromStore } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import type { GroupLetter } from "../../types";
import { QualificationStatusBadge } from "../shared/QualificationStatusBadge";
import { TeamFlag } from "../team/TeamFlag";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";

type QualFilter = "all" | "qualified" | "projected" | "at_risk" | "eliminated" | "contention";

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const filterConfig: { id: QualFilter; label: string; activeClass: string }[] = [
  { id: "all", label: APP_COPY.teams.filterAll, activeClass: "teams-filter-pill--all" },
  { id: "qualified", label: APP_COPY.teams.filterQualified, activeClass: "teams-filter-pill--qualified" },
  { id: "projected", label: APP_COPY.teams.filterProjected, activeClass: "teams-filter-pill--projected" },
  { id: "at_risk", label: APP_COPY.teams.filterAtRisk, activeClass: "teams-filter-pill--at-risk" },
  { id: "eliminated", label: APP_COPY.teams.filterEliminated, activeClass: "teams-filter-pill--eliminated" },
  { id: "contention", label: APP_COPY.teams.filterStillPlaying, activeClass: "teams-filter-pill--contention" }
];

function TeamRow({
  teamId,
  rank,
  points,
  gd,
  accentAnimated = false
}: {
  teamId: string;
  rank: number | string;
  points: number;
  gd: number;
  accentAnimated?: boolean;
}) {
  const teams = useStore((s) => s.teams);
  const teamProfiles = useStore((s) => s.teamProfiles);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const team = resolveTeamFromStore(teamId, teams);
  const theme = useTeamTheme(teamId);
  const view = useTeamQualificationView(teamId);
  const abbrev = team?.abbreviation?.toUpperCase() ?? "";
  const squadSize = abbrev ? teamProfiles[abbrev]?.players.length : 0;

  if (!view) return null;

  return (
    <li>
      <button
        type="button"
        className={`teams-row teams-row--accent${accentAnimated ? " teams-row--accent-animated" : ""} ${view.display.rowClass}`}
        style={theme as CSSProperties}
        onClick={() => openTeamSheet(teamId)}
      >
        <TeamFlag team={team} teamId={teamId} />
        <span className="teams-row-name team-name-text">{teamDisplayNameFromId(teamId, teams)}</span>
        <QualificationStatusBadge qual={view.status} size="xs" />
        <span className="teams-stats">
          {APP_COPY.teams.rankLabel(rank, points, gd)}
          {squadSize > 0 ? ` · ${squadSize} players` : ""}
        </span>
      </button>
    </li>
  );
}

export function TeamsView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QualFilter>("all");
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const liveMatches = useStore((s) => s.liveMatches);

  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );
  const bubbleTeamIds = useMemo(
    () => getBestThirdBubbleTeamIds(standings, qualContext),
    [standings, qualContext]
  );

  const { teamIds, layout } = useQualificationSnapshot();

  const filterSet = useMemo(() => {
    const movingOn = new Set([...layout.movingOn.confirmed, ...layout.movingOn.projected]);
    const out = new Set(layout.out.confirmed);
    const inContention = new Set([...layout.inContention.alive, ...layout.inContention.projectedOut]);
    switch (filter) {
      case "qualified":
        return new Set(layout.movingOn.confirmed);
      case "projected":
        return new Set(layout.movingOn.projected);
      case "at_risk":
        return inContention;
      case "eliminated":
        return out;
      case "contention":
        return new Set(teamIds.filter((id) => !movingOn.has(id) && !out.has(id)));
      default:
        return null;
    }
  }, [filter, layout, teamIds]);

  const counts: Record<QualFilter, number> = useMemo(
    () => ({
      all: teamIds.length,
      qualified: layout.movingOn.confirmed.length,
      projected: layout.movingOn.projected.length,
      at_risk: layout.inContention.alive.length + layout.inContention.projectedOut.length,
      eliminated: layout.out.confirmed.length,
      contention: teamIds.filter(
        (id) =>
          !layout.movingOn.confirmed.includes(id) &&
          !layout.movingOn.projected.includes(id) &&
          !layout.out.confirmed.includes(id)
      ).length
    }),
    [teamIds, layout]
  );

  const groupsWithTeams = useMemo(() => {
    return GROUPS.map((group) => {
      const groupTeams = Object.values(teams)
        .filter((t) => t.group === group)
        .filter((t) => {
          const q = query.toLowerCase();
          const matchesSearch =
            t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q);
          if (!matchesSearch) return false;
          if (!filterSet) return true;
          return filterSet.has(t.id);
        })
        .sort((a, b) => {
          const standing = standings.find((g) => g.group === group);
          const rankA = standing?.rows.findIndex((r) => r.teamId === a.id) ?? 99;
          const rankB = standing?.rows.findIndex((r) => r.teamId === b.id) ?? 99;
          return rankA - rankB;
        });

      return { group, teams: groupTeams };
    }).filter((g) => g.teams.length > 0);
  }, [teams, standings, query, filterSet]);

  const t = APP_COPY.teams;

  return (
    <div className="teams-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>
          Every nation, <span className="accent">{t.titleAccent}</span>
        </h1>
        <p>{t.heroLead}</p>
      </section>

      <input
        type="search"
        className="teams-search"
        placeholder={t.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search teams"
      />

      <div className="teams-filters" role="tablist" aria-label="Filter by qualification">
        {filterConfig.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className={`teams-filter-pill ${filter === f.id ? `active ${f.activeClass}` : ""}`}
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id]})
          </button>
        ))}
      </div>

      {groupsWithTeams.map(({ group, teams: list }) => {
        const standing = standings.find((g) => g.group === group);
        return (
          <section key={group} className="teams-group-panel teams-group-panel--open">
            <header className="teams-group-header">Group {group}</header>
            <ul>
              {list.map((t) => {
                const row = standing?.rows.find((r) => r.teamId === t.id);
                const rank = row ? (standing?.rows.indexOf(row) ?? 0) + 1 : "—";
                return (
                  <TeamRow
                    key={t.id}
                    teamId={t.id}
                    rank={rank}
                    points={row?.points ?? 0}
                    gd={row?.goalDifference ?? 0}
                    accentAnimated={bubbleTeamIds.has(t.id)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
