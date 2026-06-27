import { useLiveFootballStreamSchedule } from "../../hooks/useLiveFootballStreamSchedule";
import styles from "./LiveStreamsPanel.module.css";

export function LiveStreamsPanel() {
  const { matches, loading, error } = useLiveFootballStreamSchedule();
  const live = matches.filter((m) => m.isLive);
  const upcoming = matches.filter((m) => !m.isLive).slice(0, 8);

  if (loading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Live streams</h2>
        <p className={styles.muted}>Loading football streams…</p>
      </section>
    );
  }

  if (error && matches.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Live streams</h2>
        <p className={styles.emptyTitle}>📡 Stream schedule unavailable</p>
        <p className={styles.muted}>
          Live stream listings will appear here when available. Watch links still work — tap a
          match to find stream options.
          {error ? ` (${error})` : null}
        </p>
      </section>
    );
  }

  if (matches.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Live streams</h2>
        <p className={styles.emptyTitle}>📡 Stream schedule unavailable</p>
        <p className={styles.muted}>
          Live stream listings will appear here when available. Watch links still work — tap a
          match to find stream options.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Football live streams">
      <h2 className={styles.title}>Live streams</h2>
      {live.length > 0 ? (
        <ul className={styles.list}>
          {live.map((m) => (
            <li key={m.id} className={styles.row}>
              <span className={styles.liveDot} aria-hidden />
              <span className={styles.matchTitle}>{m.title}</span>
              {m.league ? <span className={styles.league}>{m.league}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>No football streams live right now.</p>
      )}
      {upcoming.length > 0 ? (
        <>
          <h3 className={styles.subtitle}>Upcoming today</h3>
          <ul className={styles.list}>
            {upcoming.map((m) => (
              <li key={m.id} className={styles.row}>
                <span className={styles.matchTitle}>{m.title}</span>
                {m.startTime ? <span className={styles.time}>{m.startTime}</span> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
