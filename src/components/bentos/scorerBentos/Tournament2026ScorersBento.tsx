import { APP_COPY } from "../../../lib/appCopy";
import { useGoldenBootCelebrate } from "../../../hooks/useGoldenBootCelebrate";
import { useStore } from "../../../store";
import type { TournamentPlayerStat } from "../../../types";
import { TeamFlag } from "../../team/TeamFlag";
import { CrownBadge } from "../../player/CrownBadge";
import { PlayerPhoto } from "../../player/PlayerPhoto";
import { PlayerStatPopover } from "../../player/PlayerStatPopover";
import { useEnrichedPlayerPhoto } from "../../../hooks/useEnrichedPlayerPhoto";
import styles from "./ScorerBentos.module.css";

const DISPLAY_LIMIT = 8;

type RowProps = {
  rank: number;
  stat: TournamentPlayerStat;
  isLeader: boolean;
  celebrate: boolean;
};

function ScorerRow({ rank, stat, isLeader, celebrate }: RowProps) {
  const photoUrl = useEnrichedPlayerPhoto(
    stat.player.displayName,
    stat.teamId,
    stat.player.id
  );
  const name = stat.player.displayName;

  return (
    <li className={`${styles.row} ${isLeader ? styles.leaderRow : ""}`.trim()}>
      <span className={styles.rank}>{rank}</span>
      <PlayerStatPopover playerName={name} teamId={stat.teamId} goals2026={stat.value}>
        <span className={styles.rowBody}>
          <span className={`${styles.photoWrap} ${isLeader ? styles.leaderPhotoWrap : ""}`.trim()}>
            <PlayerPhoto name={name} photoUrl={photoUrl} size="sm" />
          </span>
          <span className={styles.nameBlock}>
            <span className={styles.name}>
              <span className={styles.leaderMeta}>
                {isLeader ? <CrownBadge celebrate={celebrate} /> : null}
                <span className={styles.nameText}>{name}</span>
              </span>
            </span>
            <span className={styles.sub}>
              <TeamFlag teamId={stat.teamId} size="sm" compact />
            </span>
          </span>
          <span className={styles.goals}>{stat.value}G</span>
        </span>
      </PlayerStatPopover>
    </li>
  );
}

type Props = {
  scorers: TournamentPlayerStat[];
};

export function Tournament2026ScorersBento({ scorers }: Props) {
  const copy = APP_COPY.live.scorers;
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setTournamentSubTab = useStore((s) => s.setTournamentSubTab);
  const visible = scorers.slice(0, DISPLAY_LIMIT);
  const leader = scorers[0];
  const leaderId = leader?.player.id ?? leader?.player.displayName ?? "";
  const leaderGoals = leader?.value ?? 0;
  const celebrate = useGoldenBootCelebrate(leaderId, leaderGoals);

  return (
    <article className={styles.panel} aria-label={copy.goldenBoot2026}>
      <header className={styles.header}>
        <span className={styles.kicker}>{copy.goldenBootKicker}</span>
        <h3 className={styles.title}>{copy.goldenBoot2026}</h3>
      </header>

      {visible.length === 0 ? (
        <p className={styles.empty}>{copy.no2026Scorers}</p>
      ) : (
        <ol className={styles.list}>
          {visible.map((stat, index) => (
            <ScorerRow
              key={`${stat.player.id}-${stat.teamId}`}
              rank={index + 1}
              stat={stat}
              isLeader={index === 0}
              celebrate={celebrate && index === 0}
            />
          ))}
        </ol>
      )}

      {scorers.length > 0 ? (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.footerLink}
            onClick={() => {
              setActiveTab("tournament");
              setTournamentSubTab("stats");
            }}
          >
            {copy.seeAllScorers} →
          </button>
        </footer>
      ) : null}
    </article>
  );
}
