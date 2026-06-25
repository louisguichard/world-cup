import type { CSSProperties } from "react";
import type { Team } from "../../types";
import { formatPercent } from "../../lib/normalize";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import type { TeamThemeStatus } from "./TeamThemeRoot";

type Props = {
  team?: Team;
  probability?: number;
  winner: boolean;
  clickable: boolean;
  status?: TeamThemeStatus;
  onClick: () => void;
};

export function BracketTeamButton({
  team,
  probability,
  winner,
  clickable,
  status = "default",
  onClick
}: Props) {
  const theme = useTeamTheme(team?.id);
  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;

  return (
    <button
      className={`bracket-team bracket-team-themed ${winner ? "winner" : ""}`}
      style={team ? (theme as CSSProperties) : undefined}
      data-team-id={team?.id}
      data-status={resolvedStatus === "default" ? undefined : resolvedStatus}
      onClick={onClick}
      disabled={!clickable}
      type="button"
      title={
        team
          ? `${team.name} — ${typeof probability === "number" ? formatPercent(probability, 0) : "?"} to advance`
          : undefined
      }
    >
      {team ? <img src={team.logo} alt="" /> : <span className="bracket-dot" />}
      <span>{team?.shortName ?? "TBD"}</span>
      {typeof probability === "number" ? <b>{formatPercent(probability, 0)}</b> : null}
    </button>
  );
}
