import type { CSSProperties } from "react";
import type { Team } from "../../types";
import { useTeamTheme } from "../../hooks/useTeamTheme";

type Props = {
  team: Team;
  align?: "left" | "right";
  className?: string;
};

export function TeamLabel({ team, align = "left", className = "" }: Props) {
  const theme = useTeamTheme(team.id);

  return (
    <span
      className={`team-label team-label-themed ${align === "right" ? "right" : ""} ${className}`.trim()}
      style={theme as CSSProperties}
      data-team-id={team.id}
    >
      {team.logo ? <img src={team.logo} alt="" /> : null}
      <span>{team.shortName}</span>
    </span>
  );
}
