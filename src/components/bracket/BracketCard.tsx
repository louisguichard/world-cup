import { knockoutSchedule } from "../../data/knockoutSchedule";
import { computeQualificationStatus, type QualificationMatchContext } from "../../lib/qualification";
import { lookupBracketLiveMatch } from "../../lib/bracketTree";
import { resolveBracketCardPresentation } from "../../lib/brackets/resolveBracketCardPresentation";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { teamDisplayName, teamLiveCardName } from "../../lib/teamIdentity";
import {
  formatKickoffLabel,
  formatKickoffLocal,
  resolveOfficialMatchKickoff,
} from "../../services/ScheduleLinker";
import type { KeyboardEvent } from "react";
import type {
  BracketGhostCandidate,
  BracketMatch,
  BracketSlotCertainty,
  GroupStanding,
  MergedMatch,
  Stage,
  Team,
} from "../../types";
import { CompactMatchScore } from "../match/CompactMatchScore";
import { VenueLabel } from "../venue/VenueLabel";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { resolveMatchWinner } from "../../lib/resolveMatchWinner";
import type { TeamThemeStatus } from "../team/TeamThemeRoot";

export type BracketCardVariant = "tree" | "schedule";

function GhostTeamList({
  ghosts,
  teamsById,
  showFrequency,
}: {
  ghosts: BracketGhostCandidate[];
  teamsById: Record<string, Team>;
  showFrequency: boolean;
}) {
  if (ghosts.length === 0) return null;
  return (
    <div className="bracket-ghost-list" aria-hidden="true">
      {ghosts.map(({ teamId, frequency }) => {
        const t = teamsById[teamId];
        return (
          <div key={teamId} className="bracket-ghost-team">
            <TeamFlag team={t} teamId={teamId} size="sm" compact />
            <span className="team-name-text">{teamDisplayNameFromId(teamId, teamsById)}</span>
            {showFrequency ? (
              <span className="bracket-ghost-freq">{Math.round(frequency * 100)} conf.</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function isFeederWinnerConfirmed(
  seedLabel: string | undefined,
  teamId: string,
  liveMatches: Record<string, MergedMatch>,
  teamsById: Record<string, Team>
): boolean {
  if (!seedLabel?.startsWith("W")) return false;
  const feederId = `M${seedLabel.slice(1)}`;
  const feeder = lookupBracketLiveMatch(liveMatches, feederId);
  if (!feeder?.locked || feeder.status !== "completed") return false;
  const winner = resolveMatchWinner(feeder, teamsById);
  return winner === teamId;
}

function isTeamSlotConfirmed(
  teamId: string | undefined,
  match: BracketMatch,
  side: "home" | "away",
  mode: "confirmed" | "projected",
  standings: GroupStanding[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext,
  teamsById: Record<string, Team>
): boolean {
  if (mode === "projected" || !teamId) return false;

  const live = lookupBracketLiveMatch(liveMatches, match.id);
  if (live?.locked && live.status === "completed" && live.homeScore !== undefined) {
    return true;
  }

  if (match.stage === "R32") {
    return computeQualificationStatus(teamId, standings, qualContext).certainty === "confirmed";
  }

  const seedLabel = side === "home" ? match.homeSeedLabel : match.awaySeedLabel;
  return isFeederWinnerConfirmed(seedLabel, teamId, liveMatches, teamsById);
}

function isSlotConfirmed(
  match: BracketMatch,
  mode: "confirmed" | "projected",
  standings: GroupStanding[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext,
  teamsById: Record<string, Team>
): { homeConfirmed: boolean; awayConfirmed: boolean } {
  if (mode === "projected") {
    return {
      homeConfirmed: match.homeCertainty === "confirmed",
      awayConfirmed: match.awayCertainty === "confirmed",
    };
  }

  const live = lookupBracketLiveMatch(liveMatches, match.id);
  if (live?.locked && live.status === "completed" && live.homeScore !== undefined) {
    return { homeConfirmed: true, awayConfirmed: true };
  }

  return {
    homeConfirmed: isTeamSlotConfirmed(
      match.homeTeamId,
      match,
      "home",
      mode,
      standings,
      liveMatches,
      qualContext,
      teamsById
    ),
    awayConfirmed: isTeamSlotConfirmed(
      match.awayTeamId,
      match,
      "away",
      mode,
      standings,
      liveMatches,
      qualContext,
      teamsById
    ),
  };
}

function BracketTeamReadonly({
  team,
  teamId,
  seedLabel,
  winner,
  slotConfirmed,
  ghosts,
  mode,
  teamsById,
  status = "default",
  stage,
  variant,
  onTeamSelect,
  matchId,
  onTeamPathHoverStart,
  onTeamPathHoverEnd,
}: {
  team?: Team;
  teamId?: string;
  seedLabel?: string;
  winner?: boolean;
  slotConfirmed: boolean;
  ghosts?: BracketGhostCandidate[];
  mode: "confirmed" | "projected";
  teamsById: Record<string, Team>;
  status?: TeamThemeStatus;
  stage?: Stage;
  variant: BracketCardVariant;
  onTeamSelect?: (teamId: string) => void;
  matchId?: string;
  onTeamPathHoverStart?: (matchId: string) => void;
  onTeamPathHoverEnd?: () => void;
}) {
  const resolvedTeamId = team?.id ?? teamId;
  const theme = useTeamTheme(resolvedTeamId);
  const isTree = variant === "tree";

  const effectiveCertainty: BracketSlotCertainty =
    mode === "confirmed" && !slotConfirmed ? "tbd" : slotConfirmed ? "confirmed" : "projected";
  const isKnockoutCard = Boolean(stage);
  const showConfirmedBadge =
    !isTree && effectiveCertainty === "confirmed" && mode === "confirmed" && !isKnockoutCard;
  const showProjectedBadge = !isTree && effectiveCertainty === "projected" && mode === "projected";
  const showGhostAlternates =
    !isTree && effectiveCertainty === "projected" && mode === "projected" && !slotConfirmed;
  const showGhostCount =
    isTree && effectiveCertainty === "projected" && mode === "projected" && !slotConfirmed;

  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;
  const visibleGhosts = showGhostAlternates ? (ghosts?.slice(0, 2) ?? []) : [];
  const fullName = teamDisplayName(team, "TBD", seedLabel ?? undefined);
  const displayName = isTree
    ? teamLiveCardName(team, "TBD", seedLabel ?? undefined)
    : fullName;

  if (effectiveCertainty === "tbd") {
    if (team) {
      return (
        <div className="bracket-team-slot">
          <div
            className="bracket-team bracket-team-projected-muted"
            data-team-id={team.id}
            style={{ opacity: 0.55 }}
          >
            {resolvedTeamId ? (
              <TeamFlag team={team} teamId={resolvedTeamId} size="sm" />
            ) : (
              <span className="bracket-dot" />
            )}
            <span className="team-name-text" title={fullName}>
              {displayName}
            </span>
          </div>
          {!isTree ? <CertaintyBadge certainty="projected" size="xs" /> : null}
          {visibleGhosts.length > 0 ? (
            <>
              <div className="bracket-ghost-label">Also possible</div>
              <GhostTeamList ghosts={visibleGhosts} teamsById={teamsById} showFrequency={false} />
            </>
          ) : null}
        </div>
      );
    }
    return (
      <div className="bracket-team-slot">
        <div className="bracket-team bracket-team-tbd">
          <span className="bracket-dot" />
          <span>{seedLabel ?? "TBD"}</span>
        </div>
        {!isTree ? <CertaintyBadge certainty="tbd" size="xs" /> : null}
      </div>
    );
  }

  return (
    <div className="bracket-team-slot">
      <button
        type="button"
        className={`bracket-team bracket-team-themed ${winner ? "winner" : ""} ${resolvedTeamId ? "bracket-team--clickable" : ""}`}
        style={resolvedTeamId ? theme : undefined}
        data-team-id={resolvedTeamId}
        data-status={resolvedStatus === "default" ? undefined : resolvedStatus}
        disabled={!resolvedTeamId}
        title={isTree ? fullName : undefined}
        onMouseEnter={
          isTree && matchId && onTeamPathHoverStart
            ? () => onTeamPathHoverStart(matchId)
            : undefined
        }
        onMouseLeave={isTree && onTeamPathHoverEnd ? onTeamPathHoverEnd : undefined}
        onFocus={
          isTree && matchId && onTeamPathHoverStart
            ? () => onTeamPathHoverStart(matchId)
            : undefined
        }
        onBlur={isTree && onTeamPathHoverEnd ? onTeamPathHoverEnd : undefined}
        onClick={(event) => {
          event.stopPropagation();
          if (resolvedTeamId) onTeamSelect?.(resolvedTeamId);
        }}
      >
        {resolvedTeamId ? (
          <TeamFlag team={team} teamId={resolvedTeamId} size={isTree ? "sm" : undefined} />
        ) : (
          <span className="bracket-dot" />
        )}
        <span className="team-name-text">{displayName}</span>
        {winner ? <b aria-hidden="true">✓</b> : null}
      </button>
      {showConfirmedBadge ? <CertaintyBadge certainty="confirmed" size="xs" /> : null}
      {showProjectedBadge ? <CertaintyBadge certainty="projected" size="xs" /> : null}
      {showGhostAlternates && visibleGhosts.length > 0 ? (
        <GhostTeamList ghosts={visibleGhosts} teamsById={teamsById} showFrequency={true} />
      ) : null}
      {showGhostCount && ghosts && ghosts.length > 0 ? (
        <span className="bracket-ghost-count" title={`${ghosts.length} other possible teams`}>
          +{ghosts.length}
        </span>
      ) : null}
    </div>
  );
}

type BracketCardProps = {
  match: BracketMatch;
  teamsById: Record<string, Team>;
  mode: "confirmed" | "projected";
  variant: BracketCardVariant;
  standings: GroupStanding[];
  liveMatches: Record<string, MergedMatch>;
  qualContext: QualificationMatchContext;
  onTeamSelect: (teamId: string) => void;
  onMatchSelect?: (matchId: string) => void;
  pathHighlighted?: boolean;
  pathDimmed?: boolean;
  onTeamPathHoverStart?: (matchId: string) => void;
  onTeamPathHoverEnd?: () => void;
};

export function BracketCard({
  match,
  teamsById,
  mode,
  variant,
  standings,
  liveMatches,
  qualContext,
  onTeamSelect,
  onMatchSelect,
  pathHighlighted = false,
  pathDimmed = false,
  onTeamPathHoverStart,
  onTeamPathHoverEnd,
}: BracketCardProps) {
  const isTree = variant === "tree";
  const home = match.homeTeamId ? teamsById[match.homeTeamId] : undefined;
  const away = match.awayTeamId ? teamsById[match.awayTeamId] : undefined;
  const info = knockoutSchedule[match.id];
  const kickoffUtc = info
    ? resolveOfficialMatchKickoff({ matchId: match.id, date: info.date })
    : undefined;
  const { homeConfirmed, awayConfirmed } = isSlotConfirmed(
    match,
    mode,
    standings,
    liveMatches,
    qualContext,
    teamsById
  );
  const liveMerged = lookupBracketLiveMatch(liveMatches, match.id);
  const presentation = resolveBracketCardPresentation(match, liveMerged, teamsById);
  const winnerTeamId = presentation.winnerTeamId;

  const handleMatchKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onMatchSelect) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onMatchSelect(match.id);
    }
  };

  return (
    <article
      className={[
        "bracket-card",
        isTree ? "bracket-card--tree" : "bracket-card--schedule",
        onMatchSelect ? "bracket-card--clickable" : "",
        pathHighlighted ? "bracket-card--path-highlighted" : "",
        pathDimmed ? "bracket-card--path-dimmed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role={onMatchSelect ? "button" : undefined}
      tabIndex={onMatchSelect ? 0 : undefined}
      aria-label={
        onMatchSelect
          ? `${match.label}: ${teamDisplayName(home, "TBD")} vs ${teamDisplayName(away, "TBD")}`
          : undefined
      }
      onClick={onMatchSelect ? () => onMatchSelect(match.id) : undefined}
      onKeyDown={handleMatchKeyDown}
    >
      <div className="bracket-card-head">
        <span className="match-date">
          {kickoffUtc
            ? isTree
              ? formatKickoffLocal(kickoffUtc)
              : formatKickoffLabel(kickoffUtc)
            : match.label}
        </span>
        {liveMerged?.status === "live" ? (
          <span className="bracket-live-pill" aria-label="Live match">
            LIVE
          </span>
        ) : null}
        {!isTree ? <VenueLabel matchId={match.id} inline compact /> : null}
      </div>
      <BracketTeamReadonly
        team={home}
        teamId={match.homeTeamId}
        seedLabel={match.homeSeedLabel}
        winner={Boolean(winnerTeamId && home?.id && winnerTeamId === home.id)}
        slotConfirmed={homeConfirmed}
        ghosts={homeConfirmed ? undefined : match.homeGhosts}
        mode={mode}
        teamsById={teamsById}
        stage={match.stage}
        variant={variant}
        onTeamSelect={onTeamSelect}
        matchId={match.id}
        onTeamPathHoverStart={onTeamPathHoverStart}
        onTeamPathHoverEnd={onTeamPathHoverEnd}
      />
      <BracketTeamReadonly
        team={away}
        teamId={match.awayTeamId}
        seedLabel={match.awaySeedLabel}
        winner={Boolean(winnerTeamId && away?.id && winnerTeamId === away.id)}
        slotConfirmed={awayConfirmed}
        ghosts={awayConfirmed ? undefined : match.awayGhosts}
        mode={mode}
        teamsById={teamsById}
        stage={match.stage}
        variant={variant}
        onTeamSelect={onTeamSelect}
        matchId={match.id}
        onTeamPathHoverStart={onTeamPathHoverStart}
        onTeamPathHoverEnd={onTeamPathHoverEnd}
      />
      {presentation.liveScoreMatch ? (
        <div className="bracket-scoreline">
          <CompactMatchScore match={presentation.liveScoreMatch} perspective="home" />
        </div>
      ) : presentation.scoreHome !== undefined && presentation.scoreAway !== undefined ? (
        <div className="bracket-scoreline">
          <span className="bracket-scoreline-ft">
            {presentation.scoreHome} – {presentation.scoreAway}
          </span>
          {presentation.penaltyShootout ? (
            <span className="bracket-penalty-score">
              ({presentation.penaltyShootout.homeScore} – {presentation.penaltyShootout.awayScore}{" "}
              pens)
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
