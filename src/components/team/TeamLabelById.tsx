import type { CSSProperties } from "react";
import { useTeamTheme } from "../../hooks/useTeamTheme";

type Props = {
  teamId: string;
  align?: "left" | "right";
  className?: string;
};

/** Themed team label when only an id is available (no Team object in store). */
export function TeamLabelById({ teamId, align = "left", className = "" }: Props) {
  const theme = useTeamTheme(teamId);

  return (
    <span
      className={`team-label team-label-themed ${align === "right" ? "right" : ""} ${className}`.trim()}
      style={theme as CSSProperties}
      data-team-id={teamId}
    >
      <span>{teamId.toUpperCase()}</span>
    </span>
  );
}
