import type { CSSProperties, ReactNode } from "react";
import { useTeamTheme } from "../../hooks/useTeamTheme";

type Props = {
  teamId: string;
  className?: string;
  accentAnimated?: boolean;
  children: ReactNode;
};

/** Applies team CSS vars to a table row (tr cannot use TeamThemeRoot wrapper in valid HTML). */
export function StandingThemeRow({ teamId, className = "", accentAnimated = false, children }: Props) {
  const theme = useTeamTheme(teamId);
  return (
    <tr
      className={`standing-row-themed team-row-themed${accentAnimated ? " team-accent-animated" : ""} ${className}`.trim()}
      style={theme as CSSProperties}
    >
      {children}
    </tr>
  );
}
