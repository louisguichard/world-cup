import type { ReactNode } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useOpenTeam } from "../../hooks/useOpenTeam";
import type { OpenTeamSheetOptions } from "../../lib/teamDrawer";

type Props = {
  teamId: string;
  children: ReactNode;
  className?: string;
  options?: OpenTeamSheetOptions;
  title?: string;
};

/** Clickable wrapper for table rows, ladder rows, qual chips, etc. */
export function TeamClickTarget({ teamId, children, className = "", options, title }: Props) {
  const { openTeam } = useOpenTeam();

  return (
    <button
      type="button"
      className={`team-click-target ${className}`.trim()}
      aria-label={APP_COPY.teamDrawer.openTeamProfile}
      title={title ?? APP_COPY.teamDrawer.teamClickHint}
      onClick={() => openTeam(teamId, options)}
    >
      {children}
    </button>
  );
}
