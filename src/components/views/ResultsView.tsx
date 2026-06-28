import { useMemo, useState } from "react";
import { groupResultsByDay, filterCompletedResults, type ResultsSort } from "../../lib/resultsView";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import type { GroupLetter, Stage } from "../../types";
import { ResultMatchCard } from "../match/ResultMatchCard";

const STAGES: Array<{ id: "all" | "group" | Stage; label: string }> = [
  { id: "all", label: APP_COPY.results.stageAll },
  { id: "group", label: APP_COPY.results.stageGroup },
  { id: "R32", label: APP_COPY.results.stageR32 },
  { id: "R16", label: APP_COPY.results.stageR16 },
  { id: "QF", label: APP_COPY.results.stageQF },
  { id: "SF", label: APP_COPY.results.stageSF },
  { id: "Final", label: APP_COPY.results.stageFinal }
];

const GROUPS: GroupLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function ResultsView() {
  const copy = APP_COPY.results;
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
      const home = teamDisplayNameFromId(m.homeTeamId, teams);
      const away = teamDisplayNameFromId(m.awayTeamId, teams);
      return home.toLowerCase().includes(q) || away.toLowerCase().includes(q);
    });
  }, [liveMatchesMap, sort, stage, group, search, teams]);

  const daySections = useMemo(() => groupResultsByDay(filtered, sort), [filtered, sort]);

  return (
    <div className="results-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          Every <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      <div className="results-controls-sticky">
        <label className="results-control">
          <span className="results-control-label">{copy.sortLabel}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as ResultsSort)} aria-label={copy.sortLabel}>
            <option value="recent">{copy.sortRecent}</option>
            <option value="oldest">{copy.sortOldest}</option>
            <option value="highest_scoring">{copy.sortHighScore}</option>
            <option value="biggest_win">{copy.sortBigWin}</option>
          </select>
        </label>
        <label className="results-control">
          <span className="results-control-label">{copy.stageLabel}</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as typeof stage)}
            aria-label={copy.stageLabel}
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="results-control">
          <span className="results-control-label">{copy.groupLabel}</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as typeof group)}
            aria-label={copy.groupLabel}
          >
            <option value="all">{copy.groupAll}</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                Group {g}
              </option>
            ))}
          </select>
        </label>
        <label className="results-control results-control--search">
          <span className="results-control-label">{copy.searchLabel}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchLabel}
          />
        </label>
      </div>

      {daySections.length === 0 ? (
        <p className="view-note">{copy.empty}</p>
      ) : (
        daySections.map((section) => (
          <section key={section.dateKey} className="results-day-section">
            <div className="section-heading compact">
              <div>
                <div className="section-kicker">{section.isToday ? copy.today : copy.day}</div>
                <h2 className="section-title-text">{section.label}</h2>
              </div>
            </div>
            <div className="results-match-list">
              {section.matches.map((m) => (
                <ResultMatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
