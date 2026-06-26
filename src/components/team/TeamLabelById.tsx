import type { CSSProperties } from "react";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { teamDisplayName } from "../../lib/teamIdentity";
import { TeamFlag } from "./TeamFlag";

type Props = {
  teamId: string;
  align?: "left" | "right";
  className?: string;
};

/** Themed team label when only an id is available (no Team object in store). */
export function TeamLabelById({ teamId, align = "left", className = "" }: Props) {
  const theme = useTeamTheme(teamId);
  const team = useStore((s) => s.teams[teamId]);

  return (
    <span
      className={`team-label team-label-themed ${align === "right" ? "right" : ""} ${className}`.trim()}
      style={theme as CSSProperties}
      data-team-id={teamId}
    >
      <TeamFlag team={team} teamId={teamId} />
      <span className="team-name-text">{teamDisplayName(team, teamId.toUpperCase())}</span>
    </span>
  );
}
