import { useDeferredValue, useMemo } from "react";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { buildQualificationContext, computeQualificationStatus, type QualificationMatchContext } from "../../lib/qualification";
import { buildCanonicalTournamentDataset } from "../../lib/canonicalTournamentDataset";
import { projectTournament } from "../../lib/tournament";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import { APP_COPY } from "../../lib/appCopy";
import { formatKickoffLabel, resolveKickoffByMatchId } from "../../services/ScheduleLinker";
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
import { VenueLabel } from "../venue/VenueLabel";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import type { TeamThemeStatus } from "../team/TeamThemeRoot";

const allBracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];
const stageColumns: Record<Stage, number> = { R32: 1, R16: 2, QF: 3, SF: 4, Final: 5 };

/** Locked-in mode: R32 only until group stage + third-place cutoffs are FIFA-confirmed. */
function visibleBracketStages(mode: "confirmed" | "projected"): Stage[] {
  return mode === "confirmed" ? ["R32"] : allBracketStages;
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

function feederWinnerId(feeder: MergedMatch): string | undefined {
  if (feeder.homeScore === undefined || feeder.awayScore === undefined) return undefined;
  if (feeder.homeScore > feeder.awayScore) return feeder.homeTeamId;
  if (feeder.awayScore > feeder.homeScore) return feeder.awayTeamId;
  return undefined;
}

function isFeederWinnerConfirmed(
  seedLabel: string | undefined,
  teamId: string,
  liveMatches: Record<string, MergedMatch>
): boolean {
  if (!seedLabel?.startsWith("W")) return false;
  const feederId = `M${seedLabel.slice(1)}`;
  const feeder = liveMatches[feederId];
  if (!feeder?.locked || feeder.status !== "completed") return false;
  return feederWinnerId(feeder) === teamId;
}

function isTeamSlotConfirmed(
  teamId: string | undefined,
  match: BracketMatch,
  side: "home" | "away",
  mode: "confirmed" | "projected",
  standings: GroupStanding[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext
): boolean {
  if (mode === "projected" || !teamId) return false;

  const live = liveMatches[match.id];
  if (live?.locked && live.status === "completed" && live.homeScore !== undefined) {
    return true;
  }

  if (match.stage === "R32") {
    return computeQualificationStatus(teamId, standings, qualContext).certainty === "confirmed";
  }

  const seedLabel = side === "home" ? match.homeSeedLabel : match.awaySeedLabel;
  return isFeederWinnerConfirmed(seedLabel, teamId, liveMatches);
}

function isSlotConfirmed(
  match: BracketMatch,
  mode: "confirmed" | "projected",
  standings: GroupStanding[],
  liveMatches: Record<string, MergedMatch>,
  qualContext: QualificationMatchContext
): { homeConfirmed: boolean; awayConfirmed: boolean } {
  if (mode === "projected") {
    return { homeConfirmed: false, awayConfirmed: false };
  }

  const live = liveMatches[match.id];
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
    qualContext
  );
  const awayConfirmed = isTeamSlotConfirmed(
    match.awayTeamId,
    match,
    "away",
    mode,
    standings,
    liveMatches,
    qualContext
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
  onTeamSelect?: (teamId: string) => void;
}) {
  const resolvedTeamId = team?.id ?? teamId;
  const theme = useTeamTheme(resolvedTeamId);

  const effectiveCertainty: BracketSlotCertainty =
    mode === "confirmed" && !slotConfirmed ? "tbd" : slotConfirmed ? "confirmed" : "projected";

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
      {effectiveCertainty === "confirmed" ? (
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
    ? resolveKickoffByMatchId(match.id, info.date, Object.values(liveMatches))
    : undefined;
  const { homeConfirmed, awayConfirmed } = isSlotConfirmed(match, mode, standings, liveMatches, qualContext);

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
        onTeamSelect={onTeamSelect}
      />
      {match.homeScore !== undefined && match.awayScore !== undefined ? (
        <div className="bracket-scoreline">
          {match.homeScore} – {match.awayScore}
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
            m.status === "completed" &&
            m.locked
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
      qualContext.lockedStandingsByGroup
    );
  }, [teams, deferredProjectionMatches, markets, overrides, qualContext.lockedGroupMatchCount, qualContext.lockedStandingsByGroup]);

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
  const bracketStages = visibleBracketStages(mode);

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
        <p className="view-note">{bb.loading}</p>
      ) : (
        <div className="bracket-scroll">
          <div className="bracket-head">
            {bracketStages.map((stage) => (
              <h3 key={stage} style={{ gridColumn: stageColumns[stage] }}>
                {stage}
              </h3>
            ))}
          </div>
          <div className="bracket-rounds">
            {bracketStages.map((stage) => (
              <div className={`bracket-round ${stage === "Final" ? "is-final" : ""}`} key={stage}>
                {orderedByStage[stage].map((match) => (
                  <div className="bracket-cell" key={match.id}>
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
