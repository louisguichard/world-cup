import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { computeQualificationStatus, type QualificationMatchContext } from "../../lib/qualification";
import { buildCanonicalTournamentDataset } from "../../lib/canonicalTournamentDataset";
import { collectBracketPathForMatch } from "../../lib/brackets/bracketPathHighlight";
import {
  collectBracketPathForTeam,
  resolveFollowedTeamFocusStage,
} from "../../lib/brackets/collectBracketPathForTeam";
import { buildBracketViewModel } from "../../lib/brackets/buildBracketViewModel";
import { APP_COPY } from "../../lib/appCopy";
import { getQualificationContext } from "../../lib/qualificationContextCache";
import { getMaterializedScheduleBundleFromStore } from "../../lib/materializedScheduleCache";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import { isDesktopBracketViewport } from "../../lib/bracketLayoutPreference";
import { bracketStageShortLabel } from "../../lib/brackets/bracketStageLabels";
import type { BracketLayoutMode, BracketMatch, Stage, TournamentProjection } from "../../types";
import { useStore } from "../../store";
import {
  useBracketProjectionFingerprint,
  useBracketTeams,
  useKnockoutLiveMatches,
} from "../../store/selectors/bracketSelectors";
import { LoadingState } from "../shared/LoadingState";
import { BracketConnectorOverlay } from "./BracketConnectorOverlay";
import { orderBracketByStage, sortBracketMatchesByDate } from "../../lib/brackets/bracketVisualOrder";
import { isMergedMatchInActivePhase } from "../../lib/matchLifecycle";
import { isKnockoutMatch } from "../../lib/resolveMatchWinner";
import { BracketCard } from "../bracket/BracketCard";
import { BracketFollowTeamControl } from "../bracket/BracketFollowTeamControl";
import { BracketMobileRoundSwipe } from "../bracket/BracketMobileRoundSwipe";
import { SplitBracketCanvas } from "../bracket/SplitBracketCanvas";

const allBracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];

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

type BracketBentoProps = {
  embedded?: boolean;
  /** Overrides store layout — live embed always uses schedule list. */
  forceLayoutMode?: BracketLayoutMode;
};

function BracketBentoInner({ embedded = false, forceLayoutMode }: BracketBentoProps) {
  const mode = useStore((s) => s.bracketViewMode);
  const layoutMode = useStore((s) => s.bracketLayoutMode);
  const deferredMode = useDeferredValue(mode);
  const effectiveLayout = forceLayoutMode ?? layoutMode;
  const deferredLayout = useDeferredValue(effectiveLayout);
  const openTeamSheet = useStore((s) => s.openTeamSheet);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const followedTeamId = useStore((s) => s.followedTeamId);
  const teamsMap = useBracketTeams();
  const knockoutLiveMatches = useKnockoutLiveMatches();
  const projectionFingerprint = useBracketProjectionFingerprint(deferredMode);
  const { isKnockoutActive } = useTournamentPhase();
  const [activeStage, setActiveStage] = useState<Stage>("R32");
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });
  const [isDesktopViewport, setIsDesktopViewport] = useState(isDesktopBracketViewport);

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

  const projection = useMemo(() => {
    if (!teams.length) return null;
    const store = useStore.getState();
    const mergedSchedule = getMaterializedScheduleBundleFromStore().schedule;
    return buildBracketViewModel({
      mode: deferredMode,
      context: "tab",
      teams,
      matches,
      liveMatches: store.liveMatches,
      qualContext,
      mergedSchedule,
      knockoutMarkets: store.knockoutMarkets,
      scoreOverrides: store.scoreOverrides,
    });
  }, [deferredMode, projectionFingerprint, teams, matches, qualContext]);

  const orderedByStage = useMemo(() => {
    if (!projection?.bracket) {
      return { R32: [], R16: [], QF: [], SF: [], ThirdPlace: [], Final: [] } as Record<Stage, BracketMatch[]>;
    }
    return orderBracketByStage(projection.bracket);
  }, [projection?.bracket]);

  const bracketStages = useMemo(
    () => visibleBracketStages(deferredMode, orderedByStage),
    [deferredMode, orderedByStage]
  );

  useEffect(() => {
    if (!bracketStages.includes(activeStage)) {
      setActiveStage(bracketStages[0] ?? "R32");
    }
  }, [activeStage, bracketStages]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const bb = APP_COPY.bracketBento;
  const scheduleMatches = useMemo(() => {
    const flat: BracketMatch[] = [];
    for (const stage of bracketStages) {
      flat.push(...orderedByStage[stage]);
    }
    return sortBracketMatchesByDate(flat);
  }, [orderedByStage, bracketStages]);

  const isScheduleLayout = deferredLayout === "schedule";
  const showConnectors =
    !isScheduleLayout && isDesktopViewport && !embedded && bracketStages.length > 1;
  const showSplitCanvas = showConnectors;
  const showMobileRoundSwipe =
    !isScheduleLayout && !showSplitCanvas && !embedded && bracketStages.length > 1;

  const scrollRef = useRef<HTMLDivElement>(null);
  const roundsRef = useRef<HTMLDivElement>(null);
  const [cardRects, setCardRects] = useState<Map<string, DOMRect>>(new Map());
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  const updateScrollEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setScrollEdges({
      left: el.scrollLeft > 8,
      right: maxScroll - el.scrollLeft > 8,
    });
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const roundsEl = roundsRef.current;
    if (!scrollEl || !roundsEl || !projection?.bracket || showSplitCanvas) return;

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
      updateScrollEdges();
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
  }, [projection?.bracket, bracketStages, deferredMode, deferredLayout, updateScrollEdges, showSplitCanvas]);

  const { confirmedWinners, liveProvisionalFeeders } = useMemo(() => {
    const confirmed = new Set<string>();
    const liveProvisional = new Set<string>();

    for (const [key, match] of Object.entries(knockoutLiveMatches)) {
      const id = match.matchId ?? match.id ?? key;
      if (match.status === "completed" && match.locked) {
        confirmed.add(id);
        continue;
      }
      if (!isMergedMatchInActivePhase(match) || !isKnockoutMatch(match)) continue;
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

  const { visibleMatchIds, matchesById } = useMemo(() => {
    const ids = new Set<string>();
    const byId = new Map<string, BracketMatch>();
    for (const stage of bracketStages) {
      for (const match of orderedByStage[stage]) {
        ids.add(match.id);
        byId.set(match.id, match);
      }
    }
    return { visibleMatchIds: ids, matchesById: byId };
  }, [bracketStages, orderedByStage]);

  const [pathHighlight, setPathHighlight] = useState<Set<string> | null>(null);

  const followedPath = useMemo(() => {
    if (!followedTeamId || !projection?.bracket) return null;
    const path = collectBracketPathForTeam(
      followedTeamId,
      projection.bracket,
      knockoutLiveMatches,
      teamsMap
    );
    return path.size > 0 ? path : null;
  }, [followedTeamId, projection?.bracket, knockoutLiveMatches, teamsMap]);

  const activePathHighlight = pathHighlight ?? followedPath;
  const showPathFilter = Boolean(activePathHighlight?.size) && (showConnectors || showMobileRoundSwipe);

  const showPathHighlight = showPathFilter;

  const handleTeamPathHoverStart = useCallback((matchId: string) => {
    setPathHighlight(collectBracketPathForMatch(matchId));
  }, []);

  const handleTeamPathHoverEnd = useCallback(() => {
    setPathHighlight(null);
  }, []);

  useEffect(() => {
    if (!followedTeamId || !followedPath) return;
    const focusStage = resolveFollowedTeamFocusStage(
      followedTeamId,
      bracketStages,
      orderedByStage
    );
    if (focusStage) {
      setActiveStage(focusStage);
    }
  }, [followedTeamId, followedPath, bracketStages, orderedByStage]);

  const handleMatchSelect = useCallback(
    (matchId: string) => {
      openMatchDetail(matchId, { from: "bracket", bracketRound: activeStage });
    },
    [activeStage, openMatchDetail]
  );

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !projection?.bracket?.length || showMobileRoundSwipe) return;

    const focusCard = (matchId: string) => {
      const card = root.querySelector<HTMLElement>(`[data-match-id="${matchId}"] .bracket-card--clickable`);
      card?.focus();
    };

    const orderedIds = isScheduleLayout
      ? scheduleMatches.map((match) => match.id)
      : bracketStages.flatMap((stage) => orderedByStage[stage].map((match) => match.id));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !root.contains(active)) return;

      const currentCell = active.closest<HTMLElement>("[data-match-id]");
      const currentId = currentCell?.dataset.matchId;
      if (!currentId) return;

      const index = orderedIds.indexOf(currentId);
      if (index < 0) return;

      const delta =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      const nextId = orderedIds[index + delta];
      if (!nextId) return;

      event.preventDefault();
      focusCard(nextId);
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [bracketStages, isScheduleLayout, orderedByStage, scheduleMatches, showMobileRoundSwipe]);

  const qualContextStable = qualContext as QualificationMatchContext;

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
      {!projection ? (
        <LoadingState label={bb.loading} />
      ) : (
        <>
          {!isScheduleLayout ? (
            <BracketFollowTeamControl
              bracket={projection.bracket}
              teamsById={teamsMap}
              embedded={embedded}
            />
          ) : null}
          {showSplitCanvas ? (
            <SplitBracketCanvas
              visibleMatchIds={visibleMatchIds}
              matchesById={matchesById}
              teamsById={teamsMap}
              mode={deferredMode}
              standings={projection.standings}
              liveMatches={knockoutLiveMatches}
              qualContext={qualContextStable}
              confirmedWinners={confirmedWinners}
              liveProvisionalFeeders={liveProvisionalFeeders}
              pathHighlight={activePathHighlight}
              showPathHighlight={showPathHighlight}
              onTeamSelect={openTeamSheet}
              onMatchSelect={handleMatchSelect}
              onTeamPathHoverStart={handleTeamPathHoverStart}
              onTeamPathHoverEnd={handleTeamPathHoverEnd}
            />
          ) : showMobileRoundSwipe ? (
            <BracketMobileRoundSwipe
              stages={bracketStages}
              activeStage={activeStage}
              onStageChange={setActiveStage}
              orderedByStage={orderedByStage}
              teamsById={teamsMap}
              mode={deferredMode}
              standings={projection.standings}
              liveMatches={knockoutLiveMatches}
              qualContext={qualContextStable}
              onTeamSelect={openTeamSheet}
              onMatchSelect={handleMatchSelect}
              pathHighlight={activePathHighlight}
              showPathHighlight={showPathHighlight}
            />
          ) : (
          <div
            className="bracket-scroll-wrap"
            data-scroll-left={scrollEdges.left ? "true" : undefined}
            data-scroll-right={scrollEdges.right ? "true" : undefined}
          >
            <div
              className={`bracket-scroll${isScheduleLayout ? " bracket-scroll--schedule" : ""}`}
              ref={scrollRef}
            >
              <div
                className={[
                  "bracket-layout",
                  isScheduleLayout ? "bracket-layout--schedule" : "bracket-layout--tree",
                  showConnectors ? "bracket-layout--connectors" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  isScheduleLayout
                    ? undefined
                    : ({ "--bracket-stage-count": bracketStages.length } as CSSProperties)
                }
              >
                {!isScheduleLayout ? (
                  <div
                    className="bracket-head"
                    style={{ "--bracket-stage-count": bracketStages.length } as CSSProperties}
                  >
                    {bracketStages.map((stage) => (
                      <h3 key={stage}>{bracketStageShortLabel(stage)}</h3>
                    ))}
                  </div>
                ) : null}
                <div
                  className={`bracket-rounds${isScheduleLayout ? " bracket-rounds--schedule" : ""}`}
                  ref={roundsRef}
                >
                  {showConnectors && containerSize ? (
                    <BracketConnectorOverlay
                      cardRects={cardRects}
                      containerSize={containerSize}
                      confirmedWinners={confirmedWinners}
                      liveProvisionalFeeders={liveProvisionalFeeders}
                      highlightedPath={showPathHighlight ? pathHighlight : null}
                    />
                  ) : null}
                  {isScheduleLayout ? (
                    <div className="bracket-schedule-list">
                      {scheduleMatches.map((match) => (
                        <div className="bracket-cell" key={match.id} data-match-id={match.id}>
                          <BracketCard
                            match={match}
                            teamsById={teamsMap}
                            mode={deferredMode}
                            variant="schedule"
                            standings={projection.standings}
                            liveMatches={knockoutLiveMatches}
                            qualContext={qualContextStable}
                            onTeamSelect={openTeamSheet}
                            onMatchSelect={handleMatchSelect}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="bracket-rounds-grid"
                      style={{ "--bracket-stage-count": bracketStages.length } as CSSProperties}
                    >
                      {bracketStages.map((stage) => (
                        <div
                          className={`bracket-round ${stage === "Final" ? "is-final" : ""}`}
                          data-stage={stage}
                          key={stage}
                        >
                          {orderedByStage[stage].map((match) => (
                            <div className="bracket-cell" key={match.id} data-match-id={match.id}>
                              <BracketCard
                                match={match}
                                teamsById={teamsMap}
                                mode={deferredMode}
                                variant="tree"
                                standings={projection.standings}
                                liveMatches={knockoutLiveMatches}
                                qualContext={qualContextStable}
                                onTeamSelect={openTeamSheet}
                                onMatchSelect={handleMatchSelect}
                                pathHighlighted={showPathHighlight && pathHighlight!.has(match.id)}
                                pathDimmed={showPathHighlight && !pathHighlight!.has(match.id)}
                                onTeamPathHoverStart={
                                  showConnectors ? handleTeamPathHoverStart : undefined
                                }
                                onTeamPathHoverEnd={showConnectors ? handleTeamPathHoverEnd : undefined}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}
        </>
      )}
    </section>
  );
}

export const BracketBento = memo(BracketBentoInner);
