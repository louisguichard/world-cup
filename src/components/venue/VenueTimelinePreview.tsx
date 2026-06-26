import type { MergedMatch, Team } from "../../types";
import { VenueMatchRow } from "./VenueMatchRow";
import styles from "./VenueTimelinePreview.module.css";

type Props = {
  matches: MergedMatch[];
  teamsById: Record<string, Team>;
  onSelectMatch: (matchId: string) => void;
  stacked?: boolean;
};

export function VenueTimelinePreview({ matches, teamsById, onSelectMatch, stacked }: Props) {
  if (matches.length === 0) {
    return <p className="view-note">No matches in this preview window.</p>;
  }

  return (
    <div className={`${styles.timeline} ${stacked ? styles["timeline--stacked"] : ""}`}>
      {matches.map((match) => {
        const id = match.matchId ?? match.id;
        return (
          <div key={id} className={styles.timelineItem}>
            <VenueMatchRow
              match={match}
              home={teamsById[match.homeTeamId]}
              away={teamsById[match.awayTeamId]}
              onSelect={() => onSelectMatch(id)}
            />
          </div>
        );
      })}
    </div>
  );
}
