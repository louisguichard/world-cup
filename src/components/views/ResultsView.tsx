import { useMemo, useState } from "react";
import { groupResultsByDay, filterCompletedResults, type ResultsSort } from "../../lib/resultsView";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useStore } from "../../store";
import type { GroupLetter, Stage } from "../../types";
import { ResultMatchCard } from "../match/ResultMatchCard";

const STAGES: Array<{ id: "all" | "group" | Stage; label: string }> = [
  { id: "all", label: "All Stages" },
  { id: "group", label: "Group Stage" },
  { id: "R32", label: "Round of 32" },
  { id: "R16", label: "Round of 16" },
  { id: "QF", label: "Quarterfinals" },
  { id: "SF", label: "Semifinals" },
  { id: "Final", label: "Final" }
];

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function ResultsView() {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);

  const [sort, setSort] = useState<ResultsSort>("recent");
  const [stage, setStage] = useState<"all" | "group" | Stage>("all");
  const [group, setGroup] = useState<"all" | GroupLetter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = filterCompletedResults(Object.values(liveMatchesMap), {
      sort,
      stage,
      group,
      search: ""
    });
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((m) => {
      const home = teamDisplayName(teams[m.homeTeamId], m.homeTeamId);
      const away = teamDisplayName(teams[m.awayTeamId], m.awayTeamId);
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
    });
  }, [liveMatchesMap, sort, stage, group, search, teams]);

  const daySections = useMemo(() => groupResultsByDay(filtered, sort), [filtered, sort]);

  return (
    <div className="results-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">Tournament results</div>
        <h1>
          Every <span className="accent">final score.</span>
        </h1>
        <p>Completed matches grouped by day — filter, sort, and tap any row for team details.</p>
      </section>

      <div className="results-controls-sticky">
        <label className="results-control">
          <span className="results-control-label">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as ResultsSort)} aria-label="Sort results">
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_scoring">Highest Scoring</option>
            <option value="biggest_win">Biggest Win</option>
          </select>
        </label>
        <label className="results-control">
          <span className="results-control-label">Stage</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as typeof stage)}
            aria-label="Filter by stage"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="results-control">
          <span className="results-control-label">Group</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as typeof group)}
            aria-label="Filter by group"
          >
            <option value="all">All Groups</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          className="results-search"
          placeholder="Search team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search results by team"
        />
      </div>

      {filtered.length === 0 ? (
        <section className="dashboard-section">
          <p className="view-note">No results match this filter.</p>
        </section>
      ) : (
        daySections.map((section) => (
          <section key={section.dateKey} className="dashboard-section" aria-label={section.label}>
            <div className="section-heading compact">
              <div>
                <div className="section-kicker">{section.isToday ? "Today" : "Day"}</div>
                <h2 className="section-title-text">{section.label}</h2>
              </div>
            </div>
            <div className="results-list">
              {section.matches.map((match) => (
                <ResultMatchCard key={match.id} match={match} openTeamOnClick />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
