import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { teamDisplayName } from "../../lib/teamIdentity";
import { resolveTeamFromStore } from "../../lib/matchTeamDisplay";
import { useOpenTeam } from "../../hooks/useOpenTeam";
import { TeamFlag } from "./TeamFlag";

type Props = {
  teamId: string;
  /** Schedule / bracket placeholder when teamId is not yet known. */
  nameHint?: string;
  align?: "left" | "right";
  className?: string;
  displayName?: string;
  flagCompact?: boolean;
  clickable?: boolean;
  nested?: boolean;
  onTeamClick?: (teamId: string) => void;
};

/** Themed team label when only an id is available (no Team object in store). */
export function TeamLabelById({
  teamId,
  nameHint,
  align = "left",
  className = "",
  displayName,
  flagCompact,
  clickable = true,
  nested = false,
  onTeamClick,
}: Props) {
  const theme = useTeamTheme(teamId);
  const teams = useStore((s) => s.teams);
  const team = resolveTeamFromStore(teamId, teams);
  const { openTeam } = useOpenTeam();

  const label = displayName ?? teamDisplayName(team, teamId || nameHint || "TBD", nameHint);
  const baseClass = `team-label team-label-themed ${align === "right" ? "right" : ""} ${clickable ? "team-label--clickable" : ""} ${className}`.trim();

  const handleActivate = (e: MouseEvent | KeyboardEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    if (onTeamClick) {
      onTeamClick(teamId);
    } else {
      openTeam(teamId);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate(e);
    }
  };

  const content = (
    <>
      <TeamFlag team={team} teamId={teamId} nameHint={nameHint} compact={flagCompact} />
      <span className="team-name-text">{label}</span>
    </>
  );

  if (!clickable) {
    return (
      <span className={baseClass} style={theme as CSSProperties} data-team-id={teamId}>
        {content}
      </span>
    );
  }

  if (nested) {
    return (
      <span
        className={baseClass}
        style={theme as CSSProperties}
        data-team-id={teamId}
        role="button"
        tabIndex={0}
        aria-label={`${APP_COPY.teamDrawer.openTeamProfile}: ${label}`}
        title={APP_COPY.teamDrawer.teamClickHint}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={baseClass}
      style={theme as CSSProperties}
      data-team-id={teamId}
      aria-label={`${APP_COPY.teamDrawer.openTeamProfile}: ${label}`}
      title={APP_COPY.teamDrawer.teamClickHint}
      onClick={handleActivate}
    >
      {content}
    </button>
  );
}
