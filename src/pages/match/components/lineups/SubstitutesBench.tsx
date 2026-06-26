import type { Lineup } from "../../../../types";

type Props = {
  homeLineup: Lineup | undefined;
  awayLineup: Lineup | undefined;
  homeTeamName: string;
  awayTeamName: string;
};

export function SubstitutesBench({ homeLineup, awayLineup, homeTeamName, awayTeamName }: Props) {
  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ fontSize: 12, color: "var(--ss-muted)", marginBottom: 12, fontWeight: 600 }}>
        SUBSTITUTES
      </h4>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Home subs */}
        <div>
          <div style={{ fontSize: 11, color: "var(--ss-muted)", marginBottom: 8 }}>
            {homeTeamName}
          </div>
          {(homeLineup?.substitutes ?? []).map((sub) => (
            <div
              key={sub.player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: "1px solid var(--ss-border)",
                fontSize: 12
              }}
            >
              <span
                style={{
                  background: "var(--ss-elevated)",
                  color: "var(--ss-muted)",
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                {sub.player.jerseyNumber ?? ""}
              </span>
              <span style={{ color: "var(--ss-text)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sub.player.displayName}
              </span>
            </div>
          ))}
        </div>

        {/* Away subs */}
        <div>
          <div style={{ fontSize: 11, color: "var(--ss-muted)", marginBottom: 8 }}>
            {awayTeamName}
          </div>
          {(awayLineup?.substitutes ?? []).map((sub) => (
            <div
              key={sub.player.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom: "1px solid var(--ss-border)",
                fontSize: 12
              }}
            >
              <span
                style={{
                  background: "var(--ss-elevated)",
                  color: "var(--ss-muted)",
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                {sub.player.jerseyNumber ?? ""}
              </span>
              <span style={{ color: "var(--ss-text)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sub.player.displayName}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
