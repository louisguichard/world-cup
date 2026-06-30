import type { Team } from "../../types";
import {
  resolveTeamAbbrevFromHint,
  resolveTeamForDisplay,
} from "../../data/wc2026TeamCatalog";
import {
  resolveTeamLogo,
  resolveTeamLogoByAbbrev,
  resolveTeamLogoFromHint,
} from "../../lib/resolveTeamLogo";
import { teamLogoSrcSetForFlagSize, teamLogoUrlForFlagSize } from "../../lib/footballLogoUrl";
import { resolveTeamFromStore } from "../../lib/matchTeamDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import { useStore } from "../../store";
import { getTeamWorldCupTitles } from "../../lib/worldCupTitles";
import { TeamThemeRoot } from "./TeamThemeRoot";
import { WorldCupStars } from "./WorldCupStars";

type Props = {
  team?: Team;
  teamId: string;
  /** Schedule / bracket placeholder when teamId is not yet known (e.g. "2nd Group A"). */
  nameHint?: string;
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

export function TeamFlag({ team, teamId, nameHint, size = "sm", compact, dim, className }: Props) {
  const teams = useStore((s) => s.teams);
  const storeTeam = resolveTeamFromStore(teams, teamId);
  const effectiveTeam =
    resolveTeamForDisplay(teamId, team ?? storeTeam) ??
    (nameHint ? resolveTeamForDisplay(nameHint) : undefined);
  const id = effectiveTeam?.id ?? teamId;
  const abbrev =
    resolveTeamAbbrevFromHint(teamId) ??
    resolveTeamAbbrevFromHint(nameHint) ??
    resolveTeamAbbrevFromHint(effectiveTeam?.abbreviation) ??
    resolveTeamAbbrevFromHint(effectiveTeam?.name);
  const label =
    teamDisplayName(effectiveTeam, teamId || nameHint || "TBD", nameHint).slice(0, 3).toUpperCase() ||
    "TBD";
  const logo =
    resolveTeamLogo(effectiveTeam) ??
    resolveTeamLogoFromHint(teamId) ??
    (abbrev ? resolveTeamLogoByAbbrev(abbrev) : undefined);
  const logoSrc = abbrev && logo?.startsWith("/logos/teams/")
    ? teamLogoUrlForFlagSize(abbrev, size)
    : logo;
  const logoSrcSet =
    abbrev && logo?.startsWith("/logos/teams/") ? teamLogoSrcSetForFlagSize(abbrev, size) : undefined;
  const titles = getTeamWorldCupTitles(effectiveTeam);
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
          {logoSrc ? (
            <img
              src={logoSrc}
              srcSet={logoSrcSet}
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
