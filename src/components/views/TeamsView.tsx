import { useMemo, useState } from "react";
import { computeQualificationStatus } from "../../lib/qualification";
import { useStore } from "../../store";
import type { QualificationTier } from "../../types";
import { TeamThemeRoot } from "../team/TeamThemeRoot";

type Filter = QualificationTier | "all";

const filterLabels: Record<Filter, string> = {
  all: "All",
  qualified: "Qualified",
  at_risk: "At risk",
  projected_out: "Projected out",
  eliminated: "Eliminated",
  pending: "Pending"
};

export function TeamsView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const teams = useStore((s) => s.teams);
  const standings = useStore((s) => s.groupStandings);
  const openTeamSheet = useStore((s) => s.openTeamSheet);

  const filtered = useMemo(() => {
    return Object.values(teams)
      .filter((t) => {
        const q = query.toLowerCase();
        const matchesSearch =
          t.name.toLowerCase().includes(q) || t.shortName.toLowerCase().includes(q);
        const status = computeQualificationStatus(t.id, standings).status;
        const matchesFilter = filter === "all" || status === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        const rankA =
          standings.find((g) => g.group === a.group)?.rows.findIndex((r) => r.teamId === a.id) ?? 99;
        const rankB =
          standings.find((g) => g.group === b.group)?.rows.findIndex((r) => r.teamId === b.id) ?? 99;
        return rankA - rankB;
      });
  }, [teams, standings, query, filter]);

  const byGroup = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const list = map.get(t.group) ?? [];
      list.push(t);
      map.set(t.group, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const filters: Filter[] = ["all", "qualified", "at_risk", "projected_out", "eliminated"];

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
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            className={`teams-filter-pill ${filter === f ? "active" : ""}`}
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {byGroup.map(([group, list]) => (
        <details key={group} className="teams-group-panel" open={group === "A"}>
          <summary>Group {group}</summary>
          <ul>
            {list.map((t) => {
              const status = computeQualificationStatus(t.id, standings);
              const groupStanding = standings.find((g) => g.group === t.group);
              const row = groupStanding?.rows.find((r) => r.teamId === t.id);
              const rank = row ? (groupStanding?.rows.indexOf(row) ?? 0) + 1 : "—";
              return (
                <li key={t.id}>
                  <TeamThemeRoot teamId={t.id} className="team-card">
                    <div className="team-accent-bar" aria-hidden />
                    <button type="button" className="teams-row" onClick={() => openTeamSheet(t.id)}>
                      {t.logo ? <img src={t.logo} alt="" width={24} height={24} /> : null}
                      <span>{t.shortName}</span>
                      <span className={`badge badge--${status.status}`}>
                        {filterLabels[status.status as Filter] ?? status.status}
                        {status.certainty === "confirmed" ? " · locked" : status.certainty === "projected" ? " · projected" : ""}
                      </span>
                      <span className="teams-stats">
                        Rank {rank} · {row?.points ?? 0}pts · {row?.goalDifference ?? 0} GD
                      </span>
                    </button>
                  </TeamThemeRoot>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </div>
  );
}
