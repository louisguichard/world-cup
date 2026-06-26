import type { Lineup, LineupPlayer } from "../../../../types";

type Props = {
  homeLineup: Lineup;
  awayLineup: Lineup;
};

type PlayerCardProps = {
  player: LineupPlayer;
  x: number;
  y: number;
  side: "home" | "away";
};

function PlayerCard({ player, x, y, side }: PlayerCardProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Circle */}
      <circle
        r={14}
        fill={side === "home" ? "var(--ss-brand)" : "var(--ss-danger)"}
        opacity={0.9}
      />
      {/* Jersey number */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={10}
        fontWeight={700}
        fontFamily="inherit"
      >
        {player.player.jerseyNumber ?? ""}
      </text>
      {/* Name below */}
      <text
        textAnchor="middle"
        y={20}
        fill="#fff"
        fontSize={8}
        fontFamily="inherit"
        opacity={0.9}
      >
        {player.player.displayName.split(" ").pop() ?? player.player.displayName}
      </text>
      {/* Captain band */}
      {player.isCaptain ? (
        <text
          textAnchor="middle"
          y={-18}
          fill="#fcc419"
          fontSize={8}
          fontWeight={700}
          fontFamily="inherit"
        >
          (C)
        </text>
      ) : null}
    </g>
  );
}

export function PitchDiagram({ homeLineup, awayLineup }: Props) {
  const WIDTH = 300;
  const HEIGHT = 420;
  const PADDING = 20;

  // Map 0–100 grid coordinates to SVG coordinates
  const toSvgX = (x: number) => PADDING + (x / 100) * (WIDTH - PADDING * 2);
  // Home team: bottom half (y 50–100 → SVG 210–400)
  // Away team: top half (y 0–50 → SVG 20–210) — mirrored
  const toSvgYHome = (y: number) => HEIGHT - PADDING - ((y / 100) * (HEIGHT / 2 - PADDING));
  const toSvgYAway = (y: number) =>
    PADDING + ((y / 100) * (HEIGHT / 2 - PADDING));

  return (
    <div style={{ overflow: "hidden", borderRadius: 10 }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        style={{ display: "block", maxWidth: 340, margin: "0 auto" }}
        aria-label="Pitch diagram with player positions"
      >
        {/* Pitch background */}
        <rect width={WIDTH} height={HEIGHT} fill="#1a3a1a" rx={8} />

        {/* Pitch lines */}
        {/* Outer border */}
        <rect
          x={PADDING}
          y={PADDING}
          width={WIDTH - PADDING * 2}
          height={HEIGHT - PADDING * 2}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        {/* Center line */}
        <line
          x1={PADDING}
          y1={HEIGHT / 2}
          x2={WIDTH - PADDING}
          y2={HEIGHT / 2}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        {/* Center circle */}
        <circle
          cx={WIDTH / 2}
          cy={HEIGHT / 2}
          r={36}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />
        {/* Penalty areas */}
        <rect
          x={WIDTH / 2 - 60}
          y={PADDING}
          width={120}
          height={56}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />
        <rect
          x={WIDTH / 2 - 60}
          y={HEIGHT - PADDING - 56}
          width={120}
          height={56}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />

        {/* Away players (top half) */}
        {awayLineup.startingXI.map((player, i) => {
          const pos = player.gridPosition ?? { x: 50, y: i * 9 };
          return (
            <PlayerCard
              key={player.player.id}
              player={player}
              x={toSvgX(pos.x)}
              y={toSvgYAway(pos.y)}
              side="away"
            />
          );
        })}

        {/* Home players (bottom half) */}
        {homeLineup.startingXI.map((player, i) => {
          const pos = player.gridPosition ?? { x: 50, y: i * 9 };
          return (
            <PlayerCard
              key={player.player.id}
              player={player}
              x={toSvgX(pos.x)}
              y={toSvgYHome(pos.y)}
              side="home"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          padding: "8px 0",
          fontSize: 11,
          color: "var(--ss-muted)"
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--ss-brand)",
              marginRight: 4,
              verticalAlign: "middle"
            }}
          />
          Home
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "var(--ss-danger)",
              marginRight: 4,
              verticalAlign: "middle"
            }}
          />
          Away
        </span>
      </div>
    </div>
  );
}
