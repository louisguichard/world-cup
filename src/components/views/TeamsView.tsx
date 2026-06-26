import { useMemo, useState } from "react";
import {
  bucketQualificationTeams,
  buildQualificationContext,
  computeQualificationStatus,
  type QualificationMatchContext
} from "../../lib/qualification";
import { teamDisplayName } from "../../lib/teamIdentity";
import type { GroupLetter } from "../../types";
import { CertaintyBadge, type CertaintyBadgeVariant } from "../shared/CertaintyBadge";
import { TeamFlag } from "../team/TeamFlag";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";

function teamPrimaryColor(theme: ReturnType<typeof useTeamTheme>): string {
  const v = theme["--team-primary" as keyof typeof theme];
  return typeof v === "string" ? v : "#6b7280";
}

type QualFilter = "all" | "qualified" | "projected" | "at_risk" | "eliminated" | "contention";

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const filterConfig: { id: QualFilter; label: string; activeClass: string }[] = [
  { id: "all", label: "All", activeClass: "teams-filter-pill--all" },
  { id: "qualified", label: "Qualified ✓", activeClass: "teams-filter-pill--qualified" },
  { id: "projected", label: "Projected", activeClass: "teams-filter-pill--projected" },
  { id: "at_risk", label: "At Risk", activeClass: "teams-filter-pill--at-risk" },
  { id: "eliminated", label: "Eliminated ✕", activeClass: "teams-filter-pill--eliminated" },
  { id: "contention", label: "In Contention", activeClass: "teams-filter-pill--contention" }
];

function toBadgeCertainty(certainty: string): CertaintyBadgeVariant {
  if (certainty === "confirmed") return "confirmed";
  return "projected";
}

function TeamRow({
  teamId,
  rank,
  points,
  gd,
  qualContext
}: {
  teamId: string;
  rank: number | string;
  points: number;
  gd: number;
  qualContext: QualificationMatchContext;
}) {
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const team = teams[teamId];
  const theme = useTeamTheme(teamId);
  const qual = computeQualificationStatus(teamId, standings, qualContext);

  return (
    <li>
      <button
        type="button"
        className="teams-row teams-row--accent"
        style={{ borderLeftColor: teamPrimaryColor(theme) }}
        onClick={() => openTeamSheet(teamId)}
      >
        <TeamFlag team={team} teamId={teamId} />
        <span className="teams-row-name team-name-text">{teamDisplayName(team, teamId)}</span>
        <CertaintyBadge certainty={toBadgeCertainty(qual.certainty)} size="xs" />
        <span className="teams-stats">
          Rank {rank} · {points}pts · {gd >= 0 ? "+" : ""}
          {gd} GD
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

  return (
    <div className="teams-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">All 48 teams</div>
        <h1>
          Every nation, <span className="accent">one table.</span>
        </h1>
        <p>Search the roster, filter by qualification status, and tap any team for path and odds.</p>
      </section>

      <input
        type="search"
        className="teams-search"
        placeholder="Search teams..."
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
