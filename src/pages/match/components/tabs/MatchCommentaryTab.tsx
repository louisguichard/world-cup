import type { WcCommentaryEntry } from "../../../../services/WorldCup2026LiveClient";
import type { MatchStatus } from "../../../../types";
import { MatchTabEmptyState } from "../../../../components/shared/MatchTabEmptyState";
import styles from "../../MatchDetailView.module.css";

type Props = {
  commentary: WcCommentaryEntry[];
  loading: boolean;
  matchStatus?: MatchStatus;
};

export function MatchCommentaryTab({ commentary, loading, matchStatus }: Props) {
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
    const isUpcoming = matchStatus === "scheduled" || matchStatus === undefined;
    return (
      <MatchTabEmptyState
        title={isUpcoming ? "Commentary starts at kickoff." : "No commentary available."}
        detail={
          isUpcoming
            ? "Live play-by-play appears once the match starts (WC Live, SofaScore, ESPN, or derived from events)."
            : "Commentary may not be available yet for this fixture across connected feeds."
        }
      />
    );
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
              {entry.type ? (
                <span
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--ss-muted)",
                  }}
                >
                  {entry.type.replace(/_/g, " ")}
                </span>
              ) : null}
              {entry.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
