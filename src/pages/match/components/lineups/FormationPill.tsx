type Props = {
  formation: string;
};

export function FormationPill({ formation }: Props) {
  return (
    <span
      style={{
        display: "inline-block",
        background: "var(--ss-brand)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 12
      }}
    >
      {formation}
    </span>
  );
}
