import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { computeQualificationStatus, type QualificationMatchContext } from "../../lib/qualification";
import { buildCanonicalTournamentDataset } from "../../lib/canonicalTournamentDataset";
import { projectTournament } from "../../lib/tournament";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { formatKickoffLabel, resolveOfficialMatchKickoff } from "../../services/ScheduleLinker";
import { getQualificationContext } from "../../lib/qualificationContextCache";
import { getMaterializedScheduleBundleFromStore } from "../../lib/materializedScheduleCache";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import type {
  BracketGhostCandidate,
  BracketMatch,
  BracketSlotCertainty,
  GroupStanding,
  MergedMatch,
  Stage,
  Team,
  TournamentProjection,
} from "../../types";
import { useStore } from "../../store";
import {
  useBracketProjectionFingerprint,
  useBracketTeams,
  useKnockoutLiveMatches,
} from "../../store/selectors/bracketSelectors";
import { CompactMatchScore } from "../match/CompactMatchScore";
import { VenueLabel } from "../venue/VenueLabel";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { LoadingState } from "../shared/LoadingState";
import { BracketConnectorOverlay } from "./BracketConnectorOverlay";
import { lookupBracketLiveMatch } from "../../lib/bracketTree";
import { orderBracketByStage } from "../../lib/brackets/bracketVisualOrder";
import { buildConfirmedOnlyBracket } from "../../lib/brackets/buildConfirmedOnlyBracket";
import { isKnockoutMatch, resolveMatchWinner } from "../../lib/resolveMatchWinner";
import type { TeamThemeStatus } from "../team/TeamThemeRoot";

const allBracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];

/** Locked-in mode: R32 first; later rounds appear as feeder winners are confirmed. */
function visibleBracketStages(
  mode: "confirmed" | "projected",
  orderedByStage: Record<Stage, BracketMatch[]>
): Stage[] {
  if (mode === "projected") return allBracketStages;

  const stages: Stage[] = ["R32"];
  const laterStages: Stage[] = ["R16", "QF", "SF", "Final"];

  for (const stage of laterStages) {
    const hasReachableSlot = orderedByStage[stage].some(
      (match) => match.homeCertainty === "confirmed" || match.awayCertainty === "confirmed"
    );
    if (!hasReachableSlot) break;
    stages.push(stage);
  }

  return stages;
}

function GhostTeamList({
  ghosts,
  teamsById,
  showFrequency
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
            {showFrequency ? <span className="bracket-ghost-freq">{Math.round(frequency * 100)} conf.</span> : null}
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

  const homeConfirmed = isTeamSlotConfirmed(
    match.homeTeamId,
    match,
    "home",
    mode,
    standings,
    liveMatches,
    qualContext,
    teamsById
  );
  const awayConfirmed = isTeamSlotConfirmed(
    match.awayTeamId,
    match,
    "away",
    mode,
    standings,
    liveMatches,
    qualContext,
    teamsById
  );

  return { homeConfirmed, awayConfirmed };
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
  compact = true,
  onTeamSelect
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
  compact?: boolean;
  onTeamSelect?: (teamId: string) => void;
}) {
  const resolvedTeamId = team?.id ?? teamId;
  const theme = useTeamTheme(resolvedTeamId);

  const effectiveCertainty: BracketSlotCertainty =
    mode === "confirmed" && !slotConfirmed ? "tbd" : slotConfirmed ? "confirmed" : "projected";
  const isKnockoutCard = Boolean(stage);
  const showConfirmedBadge =
    !compact && effectiveCertainty === "confirmed" && mode === "confirmed" && !isKnockoutCard;
  const showProjectedBadge =
    !compact && effectiveCertainty === "projected" && mode === "projected";
  const showGhostAlternates =
    !compact && effectiveCertainty === "projected" && mode === "projected" && !slotConfirmed;

  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;
  const visibleGhosts = showGhostAlternates ? (ghosts?.slice(0, 2) ?? []) : [];

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
            <span className="team-name-text">
              {teamDisplayName(team, "TBD", seedLabel ?? undefined)}
            </span>
          </div>
          {!compact ? <CertaintyBadge certainty="projected" size="xs" /> : null}
          {visibleGhosts.length > 0 ? (
            <>
              <div className="bracket-ghost-label">Also possible</div>
              <GhostTeamList
                ghosts={visibleGhosts}
                teamsById={teamsById}
                showFrequency={false}
              />
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
        {!compact ? <CertaintyBadge certainty="tbd" size="xs" /> : null}
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
        onClick={() => resolvedTeamId && onTeamSelect?.(resolvedTeamId)}
      >
        {resolvedTeamId ? (
          <TeamFlag team={team} teamId={resolvedTeamId} />
        ) : (
          <span className="bracket-dot" />
        )}
        <span className="team-name-text">
          {teamDisplayName(team, "TBD", seedLabel ?? undefined)}
        </span>
        {winner ? <b>✓</b> : null}
      </button>
      {showConfirmedBadge ? <CertaintyBadge certainty="confirmed" size="xs" /> : null}
      {showProjectedBadge ? <CertaintyBadge certainty="projected" size="xs" /> : null}
      {showGhostAlternates && visibleGhosts.length > 0 ? (
        <GhostTeamList ghosts={visibleGhosts} teamsById={teamsById} showFrequency={true} />
      ) : null}
    </div>
  );
}

function BracketCardReadonly({
  match,
  teamsById,
  mode,
  standings,
  liveMatches,
  qualContext,
  onTeamSelect
}: {
  match: BracketMatch;
  teamsById: Record<string, Team>;
  mode: "confirmed" | "projected";
  standings: GroupStanding[];
  liveMatches: Record<string, MergedMatch>;
  qualContext: QualificationMatchContext;
  onTeamSelect: (teamId: string) => void;
}) {
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

  return (
    <article className="bracket-card">
      <div className="bracket-card-head">
        <span className="match-date">{kickoffUtc ? formatKickoffLabel(kickoffUtc) : match.label}</span>
        <VenueLabel matchId={match.id} inline compact />
      </div>
      <BracketTeamReadonly
        team={home}
        teamId={match.homeTeamId}
        seedLabel={match.homeSeedLabel}
        winner={match.winnerTeamId === home?.id}
        slotConfirmed={homeConfirmed}
        ghosts={homeConfirmed ? undefined : match.homeGhosts}
        mode={mode}
        teamsById={teamsById}
        stage={match.stage}
        onTeamSelect={onTeamSelect}
      />
      <BracketTeamReadonly
        team={away}
        teamId={match.awayTeamId}
        seedLabel={match.awaySeedLabel}
        winner={match.winnerTeamId === away?.id}
        slotConfirmed={awayConfirmed}
        ghosts={awayConfirmed ? undefined : match.awayGhosts}
        mode={mode}
        teamsById={teamsById}
        stage={match.stage}
        onTeamSelect={onTeamSelect}
      />
      {liveMerged && liveMerged.homeScore !== undefined ? (
        <div className="bracket-scoreline">
          <CompactMatchScore match={liveMerged} perspective="home" />
        </div>
      ) : match.homeScore !== undefined && match.awayScore !== undefined ? (
        <div className="bracket-scoreline">
          <span className="bracket-scoreline-ft">
            {match.homeScore} – {match.awayScore}
          </span>
          {match.penaltyShootout ? (
            <span className="bracket-penalty-score">
              ({match.penaltyShootout.homeScore} – {match.penaltyShootout.awayScore})
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function BracketBentoInner({ embedded = false }: { embedded?: boolean }) {
  const mode = useStore((s) => s.bracketViewMode);
  const deferredMode = useDeferredValue(mode);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const teamsMap = useBracketTeams();
  const knockoutLiveMatches = useKnockoutLiveMatches();
  const projectionFingerprint = useBracketProjectionFingerprint(deferredMode);
  const { isKnockoutActive } = useTournamentPhase();
  const canonical = useMemo(() => {
    const { teams, liveMatches, knockoutMarkets } = useStore.getState();
    return buildCanonicalTournamentDataset({
      teams,
      liveMatches,
      knockoutMarkets,
    });
  }, [projectionFingerprint]);
  const teams = canonical.teams;
  const matches = canonical.matches;
  const qualContext = useMemo(() => getQualificationContext(), [projectionFingerprint]);

  const projectionMatches = useMemo(
    () =>
      matches.filter((m) => {
        if (m.group) return true;
        return m.homeScore !== undefined && m.awayScore !== undefined;
      }) as Parameters<typeof projectTournament>[1],
    [matches]
  );

  const deferredProjectionMatches = useDeferredValue(projectionMatches);
  const isModePending = mode !== deferredMode;
  const [, startProjectionTransition] = useTransition();
  const [projection, setProjection] = useState<Pick<TournamentProjection, "bracket" | "standings"> | null>(
    null
  );

  useEffect(() => {
    if (!teams.length) {
      setProjection(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const store = useStore.getState();
      let result: Pick<TournamentProjection, "bracket" | "standings"> | null = null;

      if (deferredMode === "projected") {
        const mergedSchedule = getMaterializedScheduleBundleFromStore().schedule;
        result = projectTournament(
          teams,
          deferredProjectionMatches,
          store.knockoutMarkets,
          store.scoreOverrides,
          {},
          qualContext.lockedGroupMatchCount,
          qualContext.lockedStandingsByGroup,
          mergedSchedule
        );
      } else {
        result = buildConfirmedOnlyBracket(teams, matches, store.liveMatches, qualContext);
      }

      startProjectionTransition(() => {
        if (!cancelled) setProjection(result);
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    deferredMode,
    projectionFingerprint,
    teams,
    matches,
    deferredProjectionMatches,
    qualContext,
  ]);

  const orderedByStage = useMemo(() => {
    if (!projection?.bracket) {
      return { R32: [], R16: [], QF: [], SF: [], Final: [] } as Record<Stage, BracketMatch[]>;
    }
    return orderBracketByStage(projection.bracket);
  }, [projection?.bracket]);

  const bb = APP_COPY.bracketBento;
  const bracketStages = visibleBracketStages(deferredMode, orderedByStage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const roundsRef = useRef<HTMLDivElement>(null);
  const [cardRects, setCardRects] = useState<Map<string, DOMRect>>(new Map());
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const roundsEl = roundsRef.current;
    if (!scrollEl || !roundsEl || !projection?.bracket) return;

    const measure = () => {
      const origin = roundsEl.getBoundingClientRect();
      const map = new Map<string, DOMRect>();
      roundsEl.querySelectorAll<HTMLElement>("[data-match-id]").forEach((el) => {
        const id = el.dataset.matchId;
        if (!id) return;
        const elRect = el.getBoundingClientRect();
        map.set(
          id,
          new DOMRect(
            elRect.left - origin.left,
            elRect.top - origin.top,
            elRect.width,
            elRect.height
          )
        );
      });
      setCardRects(map);
      setContainerSize({ width: origin.width, height: origin.height });
    };

    let rafId = 0;
    const debouncedMeasure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    const ro = new ResizeObserver(debouncedMeasure);
    ro.observe(roundsEl);
    scrollEl.addEventListener("scroll", debouncedMeasure, { passive: true });
    window.addEventListener("resize", debouncedMeasure);
    debouncedMeasure();

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) debouncedMeasure();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      scrollEl.removeEventListener("scroll", debouncedMeasure);
      window.removeEventListener("resize", debouncedMeasure);
    };
  }, [projection?.bracket, bracketStages, deferredMode]);

  const { confirmedWinners, liveProvisionalFeeders } = useMemo(() => {
    const confirmed = new Set<string>();
    const liveProvisional = new Set<string>();

    for (const [key, match] of Object.entries(knockoutLiveMatches)) {
      const id = match.matchId ?? match.id ?? key;
      if (match.status === "completed" && match.locked) {
        confirmed.add(id);
        continue;
      }
      if (match.status !== "live" || !isKnockoutMatch(match)) continue;
      const home = match.homeScore ?? 0;
      const away = match.awayScore ?? 0;
      if (home !== away) {
        liveProvisional.add(id);
      }
    }

    for (const slot of projection?.bracket ?? []) {
      if (slot.winnerTeamId && slot.homeCertainty === "confirmed" && slot.awayCertainty === "confirmed") {
        confirmed.add(slot.id);
      }
    }

    return { confirmedWinners: confirmed, liveProvisionalFeeders: liveProvisional };
  }, [knockoutLiveMatches, projection?.bracket]);

  const showConnectors = bracketStages.length > 1;

  return (
    <section
      className={["bracket-section", embedded ? "bracket-section--embedded" : ""].filter(Boolean).join(" ")}
      aria-label="Knockout bracket"
    >
      {!embedded ? (
        <div className="section-title">
          <div>
            <div className="section-kicker">{bb.kicker}</div>
            <h2>{mode === "confirmed" ? bb.confirmedTitle : bb.projectedTitle}</h2>
          </div>
        </div>
      ) : null}
      <p className="bracket-hint">
        {mode === "confirmed"
          ? isKnockoutActive
            ? bb.confirmedKnockoutHint
            : bb.confirmedHint
          : bb.projectedHint}
      </p>
      {!projection || isModePending ? (
        <LoadingState label={bb.loading} />
      ) : (
        <div className="bracket-scroll" ref={scrollRef}>
          <div className="bracket-head">
            {bracketStages.map((stage) => (
              <h3 key={stage}>{stage}</h3>
            ))}
          </div>
          <div className="bracket-rounds" ref={roundsRef}>
            {showConnectors && containerSize ? (
              <BracketConnectorOverlay
                cardRects={cardRects}
                containerSize={containerSize}
                confirmedWinners={confirmedWinners}
                liveProvisionalFeeders={liveProvisionalFeeders}
              />
            ) : null}
            {bracketStages.map((stage) => (
              <div
                className={`bracket-round ${stage === "Final" ? "is-final" : ""}`}
                data-stage={stage}
                key={stage}
              >
                {orderedByStage[stage].map((match) => (
                  <div className="bracket-cell" key={match.id} data-match-id={match.id}>
                    <BracketCardReadonly
                      match={match}
                      teamsById={teamsMap}
                      mode={deferredMode}
                      standings={projection.standings}
                      liveMatches={knockoutLiveMatches}
                      qualContext={qualContext}
                      onTeamSelect={openTeamSheet}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export const BracketBento = memo(BracketBentoInner);
