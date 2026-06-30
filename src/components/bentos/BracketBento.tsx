import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { buildQualificationContext, computeQualificationStatus, type QualificationMatchContext } from "../../lib/qualification";
import { buildCanonicalTournamentDataset } from "../../lib/canonicalTournamentDataset";
import { projectTournament } from "../../lib/tournament";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { formatKickoffLabel, resolveOfficialMatchKickoff } from "../../services/ScheduleLinker";
import { useMaterializedSchedule } from "../../hooks/useMaterializedSchedule";
import type {
  BracketGhostCandidate,
  BracketMatch,
  BracketSlotCertainty,
  GroupStanding,
  MergedMatch,
  Stage,
  Team
} from "../../types";
import { useStore } from "../../store";
import { CompactMatchScore } from "../match/CompactMatchScore";
import { VenueLabel } from "../venue/VenueLabel";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { LoadingState } from "../shared/LoadingState";
import { BracketConnectorOverlay } from "./BracketConnectorOverlay";
import { lookupBracketLiveMatch } from "../../lib/bracketTree";
import { resolveMatchWinner } from "../../lib/resolveMatchWinner";
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
      (match) =>
        match.homeCertainty === "confirmed" ||
        match.awayCertainty === "confirmed" ||
        (match.homeSeedLabel?.startsWith("W") && Boolean(match.homeTeamId)) ||
        (match.awaySeedLabel?.startsWith("W") && Boolean(match.awayTeamId))
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
  onTeamSelect?: (teamId: string) => void;
}) {
  const resolvedTeamId = team?.id ?? teamId;
  const theme = useTeamTheme(resolvedTeamId);

  const effectiveCertainty: BracketSlotCertainty =
    mode === "confirmed" && !slotConfirmed ? "tbd" : slotConfirmed ? "confirmed" : "projected";
  const isKnockoutCard = Boolean(stage);
  const showConfirmedBadge =
    effectiveCertainty === "confirmed" && mode === "confirmed" && !isKnockoutCard;

  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;
  const visibleGhosts = ghosts?.slice(0, 2) ?? [];

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
          <CertaintyBadge certainty="projected" size="xs" />
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
        <CertaintyBadge certainty="tbd" size="xs" />
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
      {showConfirmedBadge ? (
        <>
          <CertaintyBadge certainty="confirmed" size="xs" />
        </>
      ) : null}
      {effectiveCertainty === "projected" && mode === "projected" ? (
        <CertaintyBadge certainty="projected" size="xs" />
      ) : null}
      {effectiveCertainty === "projected" && mode === "projected" && !slotConfirmed && visibleGhosts.length > 0 ? (
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

export function BracketBento({ embedded = false }: { embedded?: boolean }) {
  const mode = useStore((s) => s.bracketViewMode);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const teamsMap = useStore((s) => s.teams);
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const markets = useStore((s) => s.knockoutMarkets);
  const overrides = useStore((s) => s.scoreOverrides);
  const mergedSchedule = useMaterializedSchedule();
  const canonical = useMemo(
    () =>
      buildCanonicalTournamentDataset({
        teams: teamsMap,
        liveMatches: liveMatchesMap,
        knockoutMarkets: markets,
      }),
    [teamsMap, liveMatchesMap, markets]
  );
  const teams = canonical.teams;
  const matches = canonical.matches;
  const qualContext = useMemo(
    () => buildQualificationContext(matches, teams),
    [matches, teams]
  );

  const projectionMatches = useMemo(
    () =>
      matches.filter((m) => {
        if (mode === "confirmed") {
          return (
            m.homeScore !== undefined &&
            m.awayScore !== undefined &&
            ((m.status === "completed" && m.locked) || m.status === "live")
          );
        }
        if (m.group) return true;
        return m.homeScore !== undefined && m.awayScore !== undefined;
      }) as Parameters<typeof projectTournament>[1],
    [matches, mode]
  );

  const deferredProjectionMatches = useDeferredValue(projectionMatches);

  const projection = useMemo(() => {
    if (!teams.length) return null;
    return projectTournament(
      teams,
      deferredProjectionMatches,
      markets,
      overrides,
      {},
      qualContext.lockedGroupMatchCount,
      qualContext.lockedStandingsByGroup,
      mergedSchedule
    );
  }, [teams, deferredProjectionMatches, markets, overrides, qualContext.lockedGroupMatchCount, qualContext.lockedStandingsByGroup, mergedSchedule]);

  const orderedByStage = useMemo(() => {
    const map: Record<Stage, BracketMatch[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      Final: []
    };
    for (const slot of projection?.bracket ?? []) {
      map[slot.stage].push(slot);
    }
    return map;
  }, [projection?.bracket]);

  const bb = APP_COPY.bracketBento;
  const bracketStages = visibleBracketStages(mode, orderedByStage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardRects, setCardRects] = useState<Map<string, DOMRect>>(new Map());
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !projection?.bracket) return;

    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const map = new Map<string, DOMRect>();
      container.querySelectorAll<HTMLElement>("[data-match-id]").forEach((el) => {
        const id = el.dataset.matchId;
        if (id) map.set(id, el.getBoundingClientRect());
      });
      setCardRects(map);
      setContainerRect(cRect);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    container.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    measure();

    return () => {
      ro.disconnect();
      container.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [projection?.bracket, bracketStages, mode]);

  const confirmedWinners = useMemo(() => {
    const winners = new Set<string>();
    for (const [key, match] of Object.entries(liveMatchesMap)) {
      if (match.status !== "completed" || !match.locked) continue;
      const id = match.matchId ?? match.id ?? key;
      winners.add(id);
    }
    for (const slot of projection?.bracket ?? []) {
      if (slot.winnerTeamId && slot.homeCertainty === "confirmed" && slot.awayCertainty === "confirmed") {
        winners.add(slot.id);
      }
    }
    return winners;
  }, [liveMatchesMap, projection?.bracket]);

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
        {mode === "confirmed" ? bb.confirmedHint : bb.projectedHint}
      </p>
      {!projection ? (
        <LoadingState label={bb.loading} />
      ) : (
        <div className="bracket-scroll" ref={scrollRef}>
          <div className="bracket-head">
            {bracketStages.map((stage) => (
              <h3 key={stage}>{stage}</h3>
            ))}
          </div>
          <div className="bracket-rounds" style={{ position: "relative" }}>
            {showConnectors && containerRect ? (
              <BracketConnectorOverlay
                cardRects={cardRects}
                containerRect={containerRect}
                confirmedWinners={confirmedWinners}
              />
            ) : null}
            {bracketStages.map((stage) => (
              <div className={`bracket-round ${stage === "Final" ? "is-final" : ""}`} key={stage}>
                {orderedByStage[stage].map((match) => (
                  <div className="bracket-cell" key={match.id} data-match-id={match.id}>
                    <BracketCardReadonly
                      match={match}
                      teamsById={teamsMap}
                      mode={mode}
                      standings={projection.standings}
                      liveMatches={liveMatchesMap}
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
