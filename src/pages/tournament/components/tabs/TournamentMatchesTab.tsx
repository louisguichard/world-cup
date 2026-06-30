import { useEffect, useMemo, useRef } from "react";
import { useStore } from "../../../../store";
import { useMaterializedSchedule } from "../../../../hooks/useMaterializedSchedule";
import { groupMatchesByDay } from "../../../../lib/groupMatchesByDay";
import { TournamentMatchCard } from "../matches/TournamentMatchCard";
import { LoadingState } from "../../../../components/shared/LoadingState";
import type { DayGroup } from "../../../../lib/groupMatchesByDay";
import styles from "../../TournamentView.module.css";

export function TournamentMatchesTab() {
  const selectedDateKey = useStore((s) => s.selectedDateKey);
  const setSelectedDateKey = useStore((s) => s.setSelectedDateKey);

  const allMatches = useMaterializedSchedule();

  const dayGroups: DayGroup[] = useMemo(
    () => groupMatchesByDay(allMatches, { includeCompleted: true, labelMode: "calendar" }),
    [allMatches]
  );

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-select today on first render
  useEffect(() => {
    if (!selectedDateKey && dayGroups.length > 0) {
      const today = dayGroups.find((g) => g.isToday);
      if (today) {
        setSelectedDateKey(today.dateKey);
      }
    }
  }, [dayGroups, selectedDateKey, setSelectedDateKey]);

  // Scroll to selected date section
  useEffect(() => {
    if (!selectedDateKey) return;
    const el = sectionRefs.current[selectedDateKey];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDateKey]);

  if (dayGroups.length === 0) {
    return (
      <div className={styles.tabPanel}>
        <LoadingState label="Loading schedule…" className={styles.emptyState} />
      </div>
    );
  }

  return (
    <div className={styles.tabPanel}>
      {/* Date navigator pills */}
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
            onClick={() => setSelectedDateKey(group.dateKey)}
          >
            {group.isToday ? "Today" : group.isTomorrow ? "Tomorrow" : group.label}
          </button>
        ))}
      </div>

      {/* Match sections grouped by day */}
      <div className={styles.matchList}>
        {dayGroups.map((group) => (
          <div
            key={group.dateKey}
            className={styles.daySection}
            ref={(el) => {
              sectionRefs.current[group.dateKey] = el;
            }}
          >
            <div className={styles.daySectionHeader}>
              <span>{group.label}</span>
              {group.isToday ? <span className={styles.todayBadge}>Today</span> : null}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ss-muted)" }}>
                {group.matches.length} {group.matches.length === 1 ? "match" : "matches"}
              </span>
            </div>

            {group.matches.map((match) => (
              <TournamentMatchCard key={match.id} match={match} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
