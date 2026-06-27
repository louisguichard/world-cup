import type { Lineup } from "../../../../types";
import { resolveLineupPlayerPhoto } from "../../../../lib/resolveLineupPlayerPhoto";
import { PlayerPhoto } from "../../../../components/player/PlayerPhoto";

type Props = {
  homeLineup: Lineup | undefined;
  awayLineup: Lineup | undefined;
  homeTeamName: string;
  awayTeamName: string;
};

function SubRow({ jerseyNumber, displayName, photoUrl }: { jerseyNumber?: number; displayName: string; photoUrl?: string }) {
  return (
    <div className="lineup-sub-row">
      <PlayerPhoto name={displayName} photoUrl={photoUrl} size="sm" />
      <span className="lineup-sub-jersey">{jerseyNumber ?? ""}</span>
      <span className="lineup-sub-name">{displayName}</span>
    </div>
  );
}

export function SubstitutesBench({ homeLineup, awayLineup, homeTeamName, awayTeamName }: Props) {
  return (
    <div className="lineup-subs-bench">
      <h4 className="lineup-subs-title">SUBSTITUTES</h4>
      <div className="lineup-subs-grid">
        <div>
          <div className="lineup-subs-team">{homeTeamName}</div>
          {(homeLineup?.substitutes ?? []).map((sub) => (
            <SubRow
              key={sub.player.id}
              jerseyNumber={sub.player.jerseyNumber}
              displayName={sub.player.displayName}
              photoUrl={resolveLineupPlayerPhoto(sub.player)}
            />
          ))}
        </div>
        <div>
          <div className="lineup-subs-team">{awayTeamName}</div>
          {(awayLineup?.substitutes ?? []).map((sub) => (
            <SubRow
              key={sub.player.id}
              jerseyNumber={sub.player.jerseyNumber}
              displayName={sub.player.displayName}
              photoUrl={resolveLineupPlayerPhoto(sub.player)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
