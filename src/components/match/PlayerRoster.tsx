import { memo, useEffect, useState } from "react";
import { PlayerPhoto } from "../player/PlayerPhoto";
import {
  ensurePlayerDatabase,
  getSquadByTeamId,
  hydratePlayerImage,
  type PlayerRecord,
} from "../../data/playerDatabase";

type Props = {
  teamId: string;
  teamName: string;
  side: "home" | "away";
};

export const PlayerRoster = memo(function PlayerRoster({ teamId, teamName, side }: Props) {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await ensurePlayerDatabase();
      if (cancelled) return;

      const squad = getSquadByTeamId(teamId).slice(0, 3);
      await Promise.all(
        squad.map(async (player) => {
          if (!player.slug || player.imageUrl) return;
          const url = await hydratePlayerImage(player.slug);
          if (url) player.imageUrl = url;
        })
      );

      if (!cancelled) {
        setPlayers(squad);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!ready || players.length === 0) return null;

  return (
    <section
      className={`player-roster player-roster--${side}`}
      aria-label={`Top players for ${teamName}`}
    >
      <h3 className="player-roster-title">Top performers</h3>
      <ul className="player-roster-list">
        {players.map((player) => (
          <li key={player.slug ?? player.name} className="player-roster-card">
            <PlayerPhoto
              name={player.name}
              photoUrl={player.imageUrl}
              size="md"
              className="player-roster-photo"
            />
            <div className="player-roster-meta">
              <strong className="player-roster-name">{player.shortName || player.name}</strong>
              <span className="player-roster-position">{player.position || "—"}</span>
              {player.club ? <span className="player-roster-club">{player.club}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
});
