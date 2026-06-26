import type { CSSProperties } from "react";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import type { Team } from "../../types";

function teamPrimary(theme: CSSProperties): string {
  const v = theme["--team-primary" as keyof CSSProperties];
  return typeof v === "string" ? v : "#6b7280";
}

type Props = {
  team?: Team;
  teamId: string;
  size?: "sm" | "lg" | "xl";
};

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "team-flag",
  lg: "team-flag team-flag--lg",
  xl: "team-flag team-flag--xl"
};

export function TeamFlag({ team, teamId, size = "sm" }: Props) {
  const theme = useTeamTheme(team?.id ?? teamId);
  const label = team?.shortName ?? teamId;

  if (team?.logo) {
    return <img src={team.logo} alt="" className={sizeClass[size]} />;
  }

  return (
    <span
      className={`team-flag-fallback ${sizeClass[size]}`}
      style={{ background: teamPrimary(theme) }}
      aria-hidden
    >
      {label.slice(0, 3).toUpperCase()}
    </span>
  );
}
