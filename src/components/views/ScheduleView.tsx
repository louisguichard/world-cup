import { useMemo, useRef, useEffect, useState } from "react";
import { useStore } from "../../store";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import type { DayGroup } from "../../lib/groupMatchesByDay";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { formatKickoffTime } from "../../lib/formatKickoff";
import { localDateKey } from "../../lib/localDate";
import {
  defaultScheduleDateKey,
  filterScheduleMatches,
  sortScheduleMatches,
  type ScheduleSort,
  type ScheduleStatusFilter
} from "../../lib/scheduleView";
import styles from "./ScheduleView.module.css";
import { VenueLabel } from "../venue/VenueLabel";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_BRAND } from "../../config/appMeta";
import type { MergedMatch, Team } from "../../types";

type ViewMode = "day" | "all";

export function ScheduleView() {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const openMatchDetail = useStore((s) => s.openMatchDetail);

  const todayKey = useMemo(() => localDateKey(new Date()), []);

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ScheduleSort>("time");
  const [statusFilter, setStatusFilter] = useState<ScheduleStatusFilter>("all");

  const allMatches = useMemo(
    () => materializeFullSchedule(teams, liveMatches),
    [teams, liveMatches]
  );

  const filteredMatches = useMemo(
    () => filterScheduleMatches(allMatches, statusFilter),
    [allMatches, statusFilter]
  );

  const dayGroups = useMemo(
    () =>
      groupMatchesByDay(filteredMatches, {
        includeCompleted: true,
        labelMode: "calendar"
      }),
    [filteredMatches]
  );

  const displayGroups = useMemo((): DayGroup[] => {
    const sorted = dayGroups.map((group) => ({
      ...group,
      matches: sortScheduleMatches(group.matches, sortBy)
    }));
    if (viewMode === "all") return sorted;
    const selected = sorted.find((g) => g.dateKey === selectedDateKey);
    return selected ? [selected] : [];
  }, [dayGroups, viewMode, selectedDateKey, sortBy]);

  const dateKeys = useMemo(() => dayGroups.map((g) => g.dateKey), [dayGroups]);

  const selectedIndex = selectedDateKey ? dateKeys.indexOf(selectedDateKey) : -1;

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedDateKey || dateKeys.length === 0) return;
    setSelectedDateKey(defaultScheduleDateKey(dateKeys, todayKey));
  }, [dateKeys, selectedDateKey, todayKey]);

  useEffect(() => {
    if (!selectedDateKey || viewMode !== "day") return;
    const el = sectionRefs.current[selectedDateKey];
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selectedDateKey, viewMode]);

  const goToPrevDay = () => {
    if (selectedIndex > 0) {
      setSelectedDateKey(dateKeys[selectedIndex - 1] ?? null);
    }
  };

  const goToNextDay = () => {
    if (selectedIndex >= 0 && selectedIndex < dateKeys.length - 1) {
      setSelectedDateKey(dateKeys[selectedIndex + 1] ?? null);
    }
  };

  const jumpToToday = () => {
    const todayGroup = dayGroups.find((g) => g.isToday);
    if (todayGroup) {
      setSelectedDateKey(todayGroup.dateKey);
      setViewMode("day");
      return;
    }
    const fallback = defaultScheduleDateKey(dateKeys, todayKey);
    if (fallback) {
      setSelectedDateKey(fallback);
      setViewMode("day");
    }
  };

  return (
    <div className={styles.view}>
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{APP_BRAND.tournament}</div>
        <h1>
          Full <span className="accent">Schedule.</span>
        </h1>
        <p>All 104 matches — group stage through the Final — in your local time.</p>
      </section>

      <div className={styles.toolbar} role="toolbar" aria-label="Schedule filters">
        <div className={styles.toolbarRow}>
          <div className={styles.controlGroup} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "day" ? styles["toggleBtn--active"] : ""}`}
              onClick={() => setViewMode("day")}
            >
              Single day
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${viewMode === "all" ? styles["toggleBtn--active"] : ""}`}
              onClick={() => setViewMode("all")}
            >
              All days
            </button>
          </div>

          <div className={styles.controlGroup} role="group" aria-label="Day navigation">
            <button
              type="button"
              className={styles.navBtn}
              onClick={goToPrevDay}
              disabled={selectedIndex <= 0}
              aria-label="Previous day"
            >
              ←
            </button>
            <button type="button" className={styles.todayJumpBtn} onClick={jumpToToday}>
              Today
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={goToNextDay}
              disabled={selectedIndex < 0 || selectedIndex >= dateKeys.length - 1}
              aria-label="Next day"
            >
              →
            </button>
          </div>
        </div>

        <div className={styles.toolbarRow}>
          <label className={styles.selectLabel}>
            Status
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ScheduleStatusFilter)}
            >
              <option value="all">All matches</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className={styles.selectLabel}>
            Sort by
            <select
              className={styles.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ScheduleSort)}
            >
              <option value="time">Kickoff time</option>
              <option value="group">Group</option>
              <option value="stage">Stage</option>
            </select>
          </label>
        </div>
      </div>

      {dayGroups.length > 0 ? (
        <div className={styles.dateNav} role="navigation" aria-label="Select match date">
          {dayGroups.map((group) => (
            <button
              key={group.dateKey}
              type="button"
              className={[
                styles.datePill,
                group.isToday ? styles["datePill--today"] : "",
                selectedDateKey === group.dateKey ? styles["datePill--active"] : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setSelectedDateKey(group.dateKey);
                setViewMode("day");
              }}
            >
              {group.isToday ? "Today" : group.isTomorrow ? "Tomorrow" : group.label}
              <span className={styles.pillCount}>{group.matches.length}</span>
            </button>
          ))}
        </div>
      ) : null}

      {displayGroups.length === 0 ? (
        <div className={styles.emptyState}>
          {statusFilter === "all"
            ? "No matches in the schedule yet."
            : "No matches match this filter."}
        </div>
      ) : (
        displayGroups.map((group) => (
          <div
            key={group.dateKey}
            className={styles.dayGroup}
            ref={(el) => {
              sectionRefs.current[group.dateKey] = el;
            }}
          >
            <div className={styles.stickyHeader}>
              <span className={styles.dateLabel}>
                {group.label}
                {group.isToday ? <span className={styles.todayBadge}>Today</span> : null}
              </span>
              <span className={styles.matchCount}>
                {group.matches.length} {group.matches.length === 1 ? "match" : "matches"}
              </span>
            </div>

            <ScheduleMatchTable
              matches={group.matches}
              teams={teams}
              onOpenMatch={(id) => openMatchDetail(id, { from: "schedule" })}
            />
          </div>
        ))
      )}
    </div>
  );
}

type ScheduleMatchTableProps = {
  matches: MergedMatch[];
  teams: Record<string, Team>;
  onOpenMatch: (id: string) => void;
};

function ScheduleMatchTable({ matches, teams, onOpenMatch }: ScheduleMatchTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Home</th>
            <th>Score</th>
            <th>Away</th>
            <th>Venue</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const home = teams[m.homeTeamId];
            const away = teams[m.awayTeamId];
            return (
              <tr
                key={m.id}
                className={styles.tableRow}
                onClick={() => onOpenMatch(m.matchId ?? m.id)}
              >
                <td className={styles.timeCell}>{formatKickoffTime(m.date)}</td>
                <td className={`${styles.teamCell} ${styles["teamCell--home"]}`}>
                  <span className="team-name-text">{teamDisplayName(home, m.homeTeamId)}</span>
                </td>
                <td className={styles.scoreCell}>
                  {m.status === "completed" || m.status === "live" ? (
                    <>
                      {m.homeScore ?? "–"}{" "}
                      <span style={{ color: "var(--faint)" }}>–</span>{" "}
                      {m.awayScore ?? "–"}
                    </>
                  ) : (
                    <span style={{ color: "var(--faint)", fontSize: "0.85rem" }}>vs</span>
                  )}
                </td>
                <td className={styles.teamCell}>
                  <span className="team-name-text">{teamDisplayName(away, m.awayTeamId)}</span>
                </td>
                <td className={styles.venueCell} onClick={(e) => e.stopPropagation()}>
                  <VenueLabel
                    matchId={m.matchId ?? m.id}
                    venueString={m.venue}
                    inline
                    compact
                  />
                </td>
                <td className={styles.statusCell}>
                  <StatusBadge match={m} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type StatusBadgeProps = {
  match: {
    status: string;
    date: string;
    displayClock?: string;
    clockMinute?: number;
    clockExtra?: number;
    period?: import("../../types").MatchPeriod;
  };
};

function StatusBadge({ match }: StatusBadgeProps) {
  if (match.status === "live") {
    const clock = formatLiveClock(match as Parameters<typeof formatLiveClock>[0]);
    return (
      <span className={`${styles.badge} ${styles["badge--live"]}`}>
        <span className={styles.liveDot} aria-hidden="true" />
        {clock}
      </span>
    );
  }

  if (match.status === "completed") {
    return <span className={`${styles.badge} ${styles["badge--ft"]}`}>FT</span>;
  }

  return (
    <span className={`${styles.badge} ${styles["badge--scheduled"]}`}>
      {formatKickoffTime(match.date)}
    </span>
  );
}
