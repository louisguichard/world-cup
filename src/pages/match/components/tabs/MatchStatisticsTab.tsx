import { useState } from "react";
import type { MatchStatisticsBundle } from "../../../../types";
import { StatComparisonRow } from "../statistics/StatComparisonRow";
import { StatPeriodFilter } from "../statistics/StatPeriodFilter";
import styles from "../../MatchDetailView.module.css";

type Props = {
  statistics: MatchStatisticsBundle | null;
  loading: boolean;
  homeTeamName: string;
  awayTeamName: string;
};

type StatDef = {
  key: keyof import("../../../../types").TeamStats;
  label: string;
  isPercentage?: boolean;
};

const STAT_ROWS: StatDef[] = [
  { key: "ballPossession", label: "Ball Possession", isPercentage: true },
  { key: "totalShots", label: "Total Shots" },
  { key: "shotsOnTarget", label: "Shots on Target" },
  { key: "expectedGoals", label: "Expected Goals (xG)" },
  { key: "bigChances", label: "Big Chances" },
  { key: "bigChancesMissed", label: "Big Chances Missed" },
  { key: "corners", label: "Corner Kicks" },
  { key: "offsides", label: "Offsides" },
  { key: "fouls", label: "Fouls" },
  { key: "yellowCards", label: "Yellow Cards" },
  { key: "passAccuracy", label: "Pass Accuracy", isPercentage: true },
  { key: "totalPasses", label: "Total Passes" },
  { key: "tackles", label: "Tackles" },
  { key: "saves", label: "Goalkeeper Saves" }
];

export function MatchStatisticsTab({ statistics, loading, homeTeamName, awayTeamName }: Props) {
  const [_period, setPeriod] = useState<"all" | "first_half" | "second_half">("all");

  if (loading && !statistics) {
    return (
      <div className={styles.tabPanel}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (!statistics) {
    return <div className={styles.emptyState}>Statistics not available for this match.</div>;
  }

  const availableRows = STAT_ROWS.filter(
    (s) => statistics.home[s.key] !== undefined || statistics.away[s.key] !== undefined
  );

  return (
    <div className={styles.tabPanel}>
      <StatPeriodFilter value={_period} onChange={setPeriod} />

      {availableRows.length === 0 ? (
        <div className={styles.emptyState} style={{ padding: "24px 0" }}>
          No statistics available for this period.
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {/* Column headers */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
              fontSize: 11,
              color: "var(--ss-muted)",
              padding: "0 4px"
            }}
          >
            <span style={{ fontWeight: 600 }}>{homeTeamName}</span>
            <span style={{ fontWeight: 600 }}>{awayTeamName}</span>
          </div>

          {availableRows.map((stat) => (
            <StatComparisonRow
              key={stat.key}
              label={stat.label}
              homeValue={statistics.home[stat.key]}
              awayValue={statistics.away[stat.key]}
              isPercentage={stat.isPercentage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
