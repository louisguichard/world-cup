import type { Lineup, LineupPlayer } from "../../../../types";
import { resolveLineupPlayerPhoto } from "../../../../lib/resolveLineupPlayerPhoto";
import { PlayerPhoto } from "../../../../components/player/PlayerPhoto";
import styles from "./PitchDiagram.module.css";

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
  const photoUrl = resolveLineupPlayerPhoto(player.player);
  const surname = player.player.displayName.split(" ").pop() ?? player.player.displayName;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <foreignObject x={-14} y={-14} width={28} height={28}>
        <div className={styles.photoWrap}>
          <PlayerPhoto name={player.player.displayName} photoUrl={photoUrl} size="sm" />
        </div>
      </foreignObject>
      <circle
        r={14}
        cy={0}
        fill="none"
        stroke={side === "home" ? "var(--ss-brand)" : "var(--ss-danger)"}
        strokeWidth={2}
        opacity={0.85}
      />
      <text
        textAnchor="middle"
        y={20}
        fill="#fff"
        fontSize={8}
        fontFamily="inherit"
        opacity={0.9}
      >
        {player.player.jerseyNumber ?? ""} {surname}
      </text>
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

  const toSvgX = (x: number) => PADDING + (x / 100) * (WIDTH - PADDING * 2);
  const toSvgYHome = (y: number) => HEIGHT - PADDING - ((y / 100) * (HEIGHT / 2 - PADDING));
  const toSvgYAway = (y: number) => PADDING + ((y / 100) * (HEIGHT / 2 - PADDING));

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        className={styles.svg}
        aria-label="Pitch diagram with player positions"
      >
        <rect width={WIDTH} height={HEIGHT} fill="#1a3a1a" rx={8} />
        <rect
          x={PADDING}
          y={PADDING}
          width={WIDTH - PADDING * 2}
          height={HEIGHT - PADDING * 2}
          fill="none"
          stroke="var(--ss-pitch-line, rgba(255,255,255,0.25))"
          strokeWidth={1}
        />
        <line
          x1={PADDING}
          y1={HEIGHT / 2}
          x2={WIDTH - PADDING}
          y2={HEIGHT / 2}
          stroke="var(--ss-pitch-line, rgba(255,255,255,0.25))"
          strokeWidth={1}
        />
        <circle
          cx={WIDTH / 2}
          cy={HEIGHT / 2}
          r={36}
          fill="none"
          stroke="var(--ss-pitch-line, rgba(255,255,255,0.2))"
          strokeWidth={1}
        />
        <rect
          x={WIDTH / 2 - 60}
          y={PADDING}
          width={120}
          height={56}
          fill="none"
          stroke="var(--ss-pitch-line, rgba(255,255,255,0.2))"
          strokeWidth={1}
        />
        <rect
          x={WIDTH / 2 - 60}
          y={HEIGHT - PADDING - 56}
          width={120}
          height={56}
          fill="none"
          stroke="var(--ss-pitch-line, rgba(255,255,255,0.2))"
          strokeWidth={1}
        />

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

      <div className={styles.legend}>
        <span>
          <span className={`${styles.legendDot} ${styles.legendHome}`} />
          Home
        </span>
        <span>
          <span className={`${styles.legendDot} ${styles.legendAway}`} />
          Away
        </span>
      </div>
    </div>
  );
}
