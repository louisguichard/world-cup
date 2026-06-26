import type { MatchEvent, MergedMatch } from "../../../../types";
import type { MatchBundle } from "../../../../services/matchDetail/fetchMatchBundle";
import { MatchEventTimeline } from "../summary/MatchEventTimeline";
import styles from "../../MatchDetailView.module.css";

type Props = {
  match: MergedMatch;
  bundle: Partial<MatchBundle> | null;
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
};

export function MatchSummaryTab({ match, bundle: _bundle, events, homeTeamName, awayTeamName }: Props) {
  const hasEvents = events.length > 0;
  const isLive = match.status === "live";
  const isDone = match.status === "completed";

  if (!isLive && !isDone) {
    return (
      <div className={styles.emptyState}>
        <p>Match has not started yet.</p>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Key events will appear here when the match begins.
        </p>
      </div>
    );
  }

  if (!hasEvents) {
    return (
      <div className={styles.emptyState}>
        <p>No key events recorded yet.</p>
      </div>
    );
  }

  return (
    <MatchEventTimeline
      events={events}
      homeTeamId={match.homeTeamId}
      awayTeamId={match.awayTeamId}
      homeTeamName={homeTeamName}
      awayTeamName={awayTeamName}
    />
  );
}
