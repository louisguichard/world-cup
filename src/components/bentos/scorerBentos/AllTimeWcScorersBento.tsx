import { APP_COPY } from "../../../lib/appCopy";
import type { WcCareerLeaderRow } from "../../../lib/worldCupGoalscorersReference";
import { PlayerPhoto } from "../../player/PlayerPhoto";
import { PlayerStatPopover } from "../../player/PlayerStatPopover";
import { resolveCatalogTeamIdByName } from "../../../data/wc2026TeamCatalog";
import { useEnrichedPlayerPhoto } from "../../../hooks/useEnrichedPlayerPhoto";
import styles from "./ScorerBentos.module.css";

type RowProps = {
  row: WcCareerLeaderRow;
};

function AllTimeRow({ row }: RowProps) {
  const name = row.reference.player_name;
  const teamId = resolveCatalogTeamIdByName(row.reference.country);
  const photoUrl = useEnrichedPlayerPhoto(name, teamId);
  const active = row.reference.currently_playing_in_this_wc;

  return (
    <li className={styles.row}>
      <span className={styles.rank}>{row.rank}</span>
      <PlayerStatPopover
        playerName={name}
        countryLabel={row.reference.country}
        goals2026={row.goals2026}
      >
        <span className={styles.rowBody}>
          <PlayerPhoto name={name} photoUrl={photoUrl} size="sm" />
          <span className={styles.nameBlock}>
            <span className={styles.name}>{name}</span>
            <span className={styles.sub}>
              {row.reference.country}
              {active ? ` · ${APP_COPY.live.scorers.in2026}` : ""}
            </span>
          </span>
          <span className={styles.goals}>{row.careerTotal}G</span>
          {row.goals2026 > 0 ? (
            <span className={styles.badge2026}>+{row.goals2026}</span>
          ) : null}
        </span>
      </PlayerStatPopover>
    </li>
  );
}

type Props = {
  leaders: WcCareerLeaderRow[];
};

export function AllTimeWcScorersBento({ leaders }: Props) {
  const copy = APP_COPY.live.scorers;

  return (
    <article className={styles.panel} aria-label={copy.allTimeTopScorers}>
      <header className={styles.header}>
        <span className={styles.kicker}>{copy.allTimeKicker}</span>
        <h3 className={styles.title}>{copy.allTimeTopScorers}</h3>
      </header>

      <ol className={styles.list}>
        {leaders.map((row) => (
          <AllTimeRow key={row.reference.player_name} row={row} />
        ))}
      </ol>
    </article>
  );
}
