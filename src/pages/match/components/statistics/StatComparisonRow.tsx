type Props = {
  label: string;
  homeValue: number | undefined;
  awayValue: number | undefined;
  isPercentage?: boolean;
};

export function StatComparisonRow({ label, homeValue, awayValue, isPercentage }: Props) {
  const home = homeValue ?? 0;
  const away = awayValue ?? 0;
  const total = home + away;

  const homeWidth = total > 0 ? Math.round((home / total) * 100) : 50;
  const awayWidth = 100 - homeWidth;

  const format = (v: number) =>
    isPercentage ? `${Math.round(v)}%` : v % 1 === 0 ? String(v) : v.toFixed(1);

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Label + values */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ss-text)",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {format(home)}
        </span>
        <span style={{ fontSize: 11, color: "var(--ss-muted)", textAlign: "center" }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ss-text)",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {format(away)}
        </span>
      </div>

      {/* Animated bar */}
      <div
        style={{
          display: "flex",
          height: 4,
          borderRadius: 2,
          overflow: "hidden",
          background: "var(--ss-elevated)"
        }}
      >
        <div
          style={{
            width: `${homeWidth}%`,
            background: "var(--ss-brand)",
            borderRadius: "2px 0 0 2px",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
        <div
          style={{
            width: `${awayWidth}%`,
            background: "var(--ss-danger)",
            borderRadius: "0 2px 2px 0",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
    </div>
  );
}
