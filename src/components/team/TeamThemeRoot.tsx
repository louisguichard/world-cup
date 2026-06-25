import type { CSSProperties, ReactNode } from "react";
import { useTeamTheme } from "../../hooks/useTeamTheme";

export type TeamThemeStatus = "live" | "advancing" | "eliminated" | "default";

type Props = {
  teamId: string | undefined | null;
  className?: string;
  status?: TeamThemeStatus;
  style?: CSSProperties;
  children: ReactNode;
};

export function TeamThemeRoot({ teamId, className = "", status = "default", style, children }: Props) {
  const theme = useTeamTheme(teamId);
  const mergedStyle = { ...theme, ...style };

  return (
    <div
      className={`team-theme-root ${className}`.trim()}
      style={mergedStyle}
      data-team-id={teamId ?? undefined}
      data-status={status === "default" ? undefined : status}
    >
      {children}
    </div>
  );
}
