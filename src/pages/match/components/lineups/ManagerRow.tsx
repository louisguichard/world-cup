type Props = {
  team: "home" | "away";
  manager: string;
  teamName: string;
};

export function ManagerRow({ team, manager, teamName }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 0",
        borderBottom: "1px solid var(--ss-border)",
        fontSize: 13
      }}
    >
      <span style={{ fontSize: 18 }}>🧑‍💼</span>
      <div>
        <div style={{ fontSize: 11, color: "var(--ss-muted)" }}>
          {teamName} · Manager
        </div>
        <div style={{ color: "var(--ss-text)", fontWeight: 500, marginTop: 1 }}>
          {manager}
        </div>
      </div>
      <div
        style={{
          marginLeft: "auto",
          background: team === "home" ? "var(--ss-brand)" : "var(--ss-danger)",
          color: "#fff",
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 10,
          fontWeight: 600
        }}
      >
        {team === "home" ? "HOME" : "AWAY"}
      </div>
    </div>
  );
}
