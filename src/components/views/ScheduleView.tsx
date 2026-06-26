import { useMemo, useRef, useEffect } from "react";
import { useStore } from "../../store";
import { materializeFullSchedule } from "../../lib/materializeFullSchedule";
import { groupMatchesByDay } from "../../lib/groupMatchesByDay";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { formatKickoffTime } from "../../lib/formatKickoff";
import styles from "./ScheduleView.module.css";
import { VenueLabel } from "../venue/VenueLabel";
import { APP_BRAND } from "../../config/appMeta";

export function ScheduleView() {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const openMatchDetail = useStore((s) => s.openMatchDetail);

  const allMatches = useMemo(
    () => materializeFullSchedule(teams, liveMatches),
    [teams, liveMatches]
  );

  const dayGroups = useMemo(
    () => groupMatchesByDay(allMatches, { includeCompleted: true }),
    [allMatches]
  );

  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div className={styles.view}>
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{APP_BRAND.tournament}</div>
        <h1>
          Full <span className="accent">Schedule.</span>
        </h1>
        <p>All 104 matches — group stage through the Final — in your local time.</p>
      </section>

      {dayGroups.map((group) => (
        <div
          key={group.dateKey}
          className={styles.dayGroup}
          ref={group.isToday ? todayRef : undefined}
        >
          <div className={styles.stickyHeader}>
            <span className={styles.dateLabel}>
              {group.label}
              {group.isToday ? <span className={styles.todayBadge}>Today</span> : null}
            </span>
          </div>

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
                {group.matches.map((m) => {
                  const home = teams[m.homeTeamId];
                  const away = teams[m.awayTeamId];
                  return (
                    <tr
                      key={m.id}
                      className={styles.tableRow}
                      onClick={() => openMatchDetail(m.matchId ?? m.id, { from: "schedule" })}
                    >
                      <td className={styles.timeCell}>
                        {formatKickoffTime(m.date)}
                      </td>
                      <td className={`${styles.teamCell} ${styles["teamCell--home"]}`}>
                        {home?.shortName ?? home?.name ?? m.homeTeamId}
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
                        {away?.shortName ?? away?.name ?? m.awayTeamId}
                      </td>
                      <td
                        className={styles.venueCell}
                        onClick={(e) => e.stopPropagation()}
                      >
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
        </div>
      ))}
    </div>
  );
}

type StatusBadgeProps = {
  match: { status: string; date: string; displayClock?: string; clockMinute?: number; clockExtra?: number; period?: import("../../types").MatchPeriod };
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
