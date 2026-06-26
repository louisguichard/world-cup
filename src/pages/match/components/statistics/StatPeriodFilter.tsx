type Period = "all" | "first_half" | "second_half";

type Props = {
  value: Period;
  onChange: (period: Period) => void;
};

const OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "first_half", label: "1ST" },
  { value: "second_half", label: "2ND" }
];

export function StatPeriodFilter({ value, onChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "var(--ss-elevated)",
        borderRadius: 8,
        padding: 4,
        width: "fit-content"
      }}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          style={{
            background: value === opt.value ? "var(--ss-brand)" : "transparent",
            color: value === opt.value ? "#fff" : "var(--ss-muted)",
            border: "none",
            borderRadius: 6,
            padding: "4px 14px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s"
          }}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
