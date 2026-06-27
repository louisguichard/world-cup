import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import type { Team } from "../../types";
import { APP_COPY } from "../../lib/appCopy";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { useOpenTeam } from "../../hooks/useOpenTeam";
import { TeamFlag } from "./TeamFlag";

type Props = {
  team: Team;
  align?: "left" | "right";
  className?: string;
  /** Override visible label (e.g. compact live-card name). */
  displayName?: string;
  /** Tighter crest frame without WC stars (compact live cards). */
  flagCompact?: boolean;
  /** When false, renders a non-interactive label. Default true. */
  clickable?: boolean;
  /** Use span + role=button when nested inside another clickable (e.g. match card). */
  nested?: boolean;
  onTeamClick?: (teamId: string) => void;
};

export function TeamLabel({
  team,
  align = "left",
  className = "",
  displayName,
  flagCompact,
  clickable = true,
  nested = false,
  onTeamClick,
}: Props) {
  const theme = useTeamTheme(team.id);
  const { openTeam } = useOpenTeam();

  const label = displayName ?? teamDisplayName(team);
  const baseClass = `team-label team-label-themed ${align === "right" ? "right" : ""} ${clickable ? "team-label--clickable" : ""} ${className}`.trim();

  const handleActivate = (e: MouseEvent | KeyboardEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    if (onTeamClick) {
      onTeamClick(team.id);
    } else {
      openTeam(team.id);
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
      <TeamFlag team={team} teamId={team.id} compact={flagCompact} />
      <span className="team-name-text">{label}</span>
    </>
  );

  if (!clickable) {
    return (
      <span className={baseClass} style={theme as CSSProperties} data-team-id={team.id}>
        {content}
      </span>
    );
  }

  if (nested) {
    return (
      <span
        className={baseClass}
        style={theme as CSSProperties}
        data-team-id={team.id}
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
      data-team-id={team.id}
      aria-label={`${APP_COPY.teamDrawer.openTeamProfile}: ${label}`}
      title={APP_COPY.teamDrawer.teamClickHint}
      onClick={handleActivate}
    >
      {content}
    </button>
  );
}
