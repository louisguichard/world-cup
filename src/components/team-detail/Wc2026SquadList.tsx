import type { Wc2026Player } from "../../services/WorldCup2026Client";
import { formatMarketValue, positionLabel } from "../../services/teamProfile/normalizeTeamProfile";

type Props = {
  players: Wc2026Player[];
};

export function Wc2026SquadList({ players }: Props) {
  if (players.length === 0) {
    return <p className="team-sheet-empty">Squad photos not available yet.</p>;
  }

  return (
    <ul className="team-squad-list">
      {players.map((p) => (
        <li key={p.id} className="team-squad-row">
          <span className="team-squad-num">{p.jerseyNumber ?? "—"}</span>
          {p.image ? (
            <img src={p.image} alt="" className="team-squad-photo" loading="lazy" />
          ) : (
            <span className="team-squad-photo team-squad-photo--placeholder" aria-hidden />
          )}
          <span className="team-squad-name">
            <strong>{p.fullName}</strong>
            {p.club ? <span className="team-squad-club">{p.club}</span> : null}
          </span>
          <span className="team-squad-pos">{positionLabel(p.position)}</span>
          {p.marketValue?.display ? (
            <span className="team-squad-value">{p.marketValue.display}</span>
          ) : p.marketValue?.valueM != null ? (
            <span className="team-squad-value">
              {formatMarketValue(p.marketValue.valueM * 1_000_000, "EUR")}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
