import type { WcCommentaryEntry } from "../../../../services/WorldCup2026LiveClient";
import styles from "../../MatchDetailView.module.css";

type Props = {
  commentary: WcCommentaryEntry[];
  loading: boolean;
};

export function MatchCommentaryTab({ commentary, loading }: Props) {
  if (loading && commentary.length === 0) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (commentary.length === 0) {
    return <div className={styles.emptyState}>No commentary available.</div>;
  }

  return (
    <div className={styles.tabPanel}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        {[...commentary].reverse().map((entry, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid var(--ss-border)"
            }}
          >
            {entry.minute != null ? (
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12,
                  color: "var(--ss-brand)",
                  fontWeight: 600,
                  minWidth: 32,
                  flexShrink: 0
                }}
              >
                {entry.minute}&apos;
              </span>
            ) : (
              <span style={{ minWidth: 32, flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, color: "var(--ss-text)", lineHeight: 1.5 }}>
              {entry.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
