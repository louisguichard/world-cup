import { useMemo, useState, type CSSProperties } from "react";
import {
  bucketQualificationTeams,
  buildQualificationContext,
  computeQualificationStatus,
  type QualificationMatchContext
} from "../../lib/qualification";
import { getBestThirdBubbleTeamIds } from "../../lib/thirdPlaceLiveStatus";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import type { GroupLetter } from "../../types";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
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
  qualContext,
  accentAnimated = false
}: {
  teamId: string;
  rank: number | string;
  points: number;
  gd: number;
  qualContext: QualificationMatchContext;
  accentAnimated?: boolean;
}) {
  const teams = useStore((s) => s.teams);
  const teamProfiles = useStore((s) => s.teamProfiles);
  const standings = useStore((s) => s.groupStandings);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const team = teams[teamId];
  const theme = useTeamTheme(teamId);
  const qual = computeQualificationStatus(teamId, standings, qualContext);
  const display = resolveQualificationDisplay(qual);
  const abbrev = team?.abbreviation?.toUpperCase() ?? "";
  const squadSize = abbrev ? teamProfiles[abbrev]?.players.length : 0;

  return (
    <li>
      <button
        type="button"
        className={`teams-row teams-row--accent${accentAnimated ? " teams-row--accent-animated" : ""} ${display.rowClass}`}
        style={theme as CSSProperties}
        onClick={() => openTeamSheet(teamId)}
      >
        <TeamFlag team={team} teamId={teamId} />
        <span className="teams-row-name team-name-text">{teamDisplayName(team, teamId)}</span>
        <QualificationStatusBadge qual={qual} size="xs" />
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

  const buckets = useMemo(
    () => bucketQualificationTeams(Object.keys(teams), standings, qualContext),
    [teams, standings, qualContext]
  );

  const filterSet = useMemo(() => {
    const through = new Set([...buckets.confirmedThrough, ...buckets.projectedThrough]);
    const out = new Set([...buckets.confirmedOut, ...buckets.projectedOut]);
    switch (filter) {
      case "qualified":
        return new Set(buckets.confirmedThrough);
      case "projected":
        return new Set(buckets.projectedThrough);
      case "at_risk":
        return new Set(buckets.inContention);
      case "eliminated":
        return new Set([...buckets.confirmedOut, ...buckets.projectedOut]);
      case "contention":
        return new Set(
          Object.keys(teams).filter((id) => !through.has(id) && !out.has(id))
        );
      default:
        return null;
    }
  }, [filter, buckets, teams]);

  const counts: Record<QualFilter, number> = useMemo(
    () => ({
      all: Object.keys(teams).length,
      qualified: buckets.confirmedThrough.length,
      projected: buckets.projectedThrough.length,
      at_risk: buckets.inContention.length,
      eliminated: buckets.confirmedOut.length + buckets.projectedOut.length,
      contention: Object.keys(teams).filter(
        (id) =>
          !buckets.confirmedThrough.includes(id) &&
          !buckets.projectedThrough.includes(id) &&
          !buckets.confirmedOut.includes(id) &&
          !buckets.projectedOut.includes(id)
      ).length
    }),
    [teams, buckets]
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
                    qualContext={qualContext}
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
