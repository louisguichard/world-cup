import type { Team } from "../../types";
import { resolveTeamLogo, resolveTeamLogoFromHint } from "../../lib/resolveTeamLogo";
import { useStore } from "../../store";
import { getTeamWorldCupTitles } from "../../lib/worldCupTitles";
import { TeamThemeRoot } from "./TeamThemeRoot";
import { WorldCupStars } from "./WorldCupStars";

type Props = {
  team?: Team;
  teamId: string;
  size?: "sm" | "lg" | "xl";
  /** Hide WC stars and tighten frame for compact live cards */
  compact?: boolean;
  /** Muted treatment for eliminated / out-of-contention teams */
  dim?: boolean;
  className?: string;
};

const wrapSizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "team-flag-wrap--sm",
  lg: "team-flag-wrap--lg",
  xl: "team-flag-wrap--xl",
};

const innerSizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "sm",
  lg: "lg",
  xl: "xl",
};

export function TeamFlag({ team, teamId, size = "sm", compact, dim, className }: Props) {
  const storeTeam = useStore((s) => s.teams[teamId]);
  const effectiveTeam = team ?? storeTeam;
  const id = effectiveTeam?.id ?? teamId;
  const label = effectiveTeam?.shortName ?? teamId;
  const logo =
    resolveTeamLogo(effectiveTeam) ??
    resolveTeamLogoFromHint(teamId) ??
    resolveTeamLogoFromHint(label);
  const titles = getTeamWorldCupTitles(team);
  const wrapClass = [
    "team-flag-wrap",
    wrapSizeClass[size],
    dim ? "team-flag-wrap--dim" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={`team-flag-badge${compact ? " team-flag-badge--compact" : ""}`}>
      {compact ? null : <WorldCupStars count={titles} size={size} />}
      <TeamThemeRoot teamId={id} className={wrapClass}>
        <span className={`team-flag-inner ${innerSizeClass[size]}`}>
          {logo ? (
            <img
              src={logo}
              alt=""
              className="team-flag-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="team-flag-fallback" aria-hidden>
              {label.slice(0, 3).toUpperCase()}
            </span>
          )}
        </span>
      </TeamThemeRoot>
    </span>
  );
}
