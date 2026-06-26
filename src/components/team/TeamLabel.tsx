import type { CSSProperties } from "react";
import type { Team } from "../../types";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { teamDisplayName } from "../../lib/teamIdentity";
import { TeamFlag } from "./TeamFlag";

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
      <TeamFlag team={team} teamId={team.id} />
      <span className="team-name-text">{teamDisplayName(team)}</span>
    </span>
  );
}
