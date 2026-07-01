import { knockoutSchedule } from "../../data/knockoutSchedule";
import { formatKickoffLabel, resolveOfficialMatchKickoff } from "../../services/ScheduleLinker";
import { teamDisplayNameFromId } from "../../lib/matchTeamDisplay";
import { teamDisplayName } from "../../lib/teamIdentity";
import {
  findChildBracketMatchId,
  siblingFeederMatchId,
} from "../../lib/bracketTree";
import {
  resolveDownstreamSlotDisplay,
  resolveFeederMatchDisplay,
} from "../../lib/brackets/resolveLiveBracketContext";
import { resolveFixtureRef, buildFixtureRegistry } from "../../lib/registry";
import type { BracketMatch, BracketSlotCertainty, MergedMatch, Team } from "../../types";
import { TeamFlag } from "../team/TeamFlag";
import { CertaintyBadge } from "../shared/CertaintyBadge";
import { CompactMatchScore } from "../match/CompactMatchScore";
import type { BracketContextMatchDisplay } from "../../lib/brackets/resolveLiveBracketContext";
import styles from "./LiveBracketContextPanel.module.css";

type Props = {
  liveMatch: MergedMatch;
  bracket: BracketMatch[];
  teamsById: Record<string, Team>;
  liveMatches: Record<string, MergedMatch>;
};

const STAGE_LABELS: Record<string, string> = {
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  Final: "Final",
};

function bracketById(bracket: BracketMatch[]): Map<string, BracketMatch> {
  return new Map(bracket.map((match) => [match.id, match]));
}

function CtxMatchNode({
  display,
  teamsById,
  label,
}: {
  display: BracketContextMatchDisplay;
  teamsById: Record<string, Team>;
  label: string;
}) {
  const homeId = display.homeTeamId;
  const awayId = display.awayTeamId;
  const home = homeId ? teamsById[homeId] : undefined;
  const away = awayId ? teamsById[awayId] : undefined;

  return (
    <article className={`${styles.node} ${display.isLive ? styles.nodeLive : ""}`.trim()}>
      <header className={styles.nodeHead}>
        {display.isLive ? <span className={styles.livePill}>LIVE</span> : null}
        <span className={styles.nodeLabel}>{label}</span>
      </header>
      <div className={styles.nodeTeams}>
        <div className={styles.nodeTeam}>
          {homeId ? <TeamFlag team={home} teamId={homeId} size="sm" compact /> : <span className={styles.dot} />}
          <span>{teamDisplayName(home, "TBD", undefined)}</span>
        </div>
        <div className={styles.nodeTeam}>
          {awayId ? <TeamFlag team={away} teamId={awayId} size="sm" compact /> : <span className={styles.dot} />}
          <span>{teamDisplayName(away, "TBD", undefined)}</span>
        </div>
      </div>
      {display.liveScoreMatch ? (
        <div className={styles.nodeScore} aria-live="polite" aria-atomic="true">
          <CompactMatchScore match={display.liveScoreMatch} perspective="home" />
        </div>
      ) : display.homeScore !== undefined ? (
        <div className={styles.nodeScore} aria-live="polite" aria-atomic="true">
          <span>
            {display.homeScore}–{display.awayScore}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function CtxRoundNode({
  match,
  slotDisplay,
  teamsById,
  roundLabel,
}: {
  match: BracketMatch;
  slotDisplay: BracketContextMatchDisplay;
  teamsById: Record<string, Team>;
  roundLabel: string;
}) {
  const homeId = slotDisplay.homeTeamId ?? match.homeTeamId;
  const awayId = slotDisplay.awayTeamId ?? match.awayTeamId;
  const home = homeId ? teamsById[homeId] : undefined;
  const away = awayId ? teamsById[awayId] : undefined;
  const homeCertainty: BracketSlotCertainty =
    homeId && homeId !== match.homeTeamId
      ? "confirmed"
      : (match.homeCertainty ?? (homeId ? "projected" : "tbd"));
  const awayCertainty: BracketSlotCertainty =
    awayId && awayId !== match.awayTeamId
      ? "confirmed"
      : (match.awayCertainty ?? (awayId ? "projected" : "tbd"));

  return (
    <article className={styles.roundNode}>
      <header className={styles.nodeHead}>
        <span className={styles.nodeLabel}>{roundLabel}</span>
        <span className={styles.nodeMatchId}>{match.id}</span>
      </header>
      <div className={styles.nodeTeams}>
        <div className={`${styles.nodeTeam} ${homeCertainty === "confirmed" ? styles.nodeTeamConfirmed : ""}`.trim()}>
          {homeId ? (
            <TeamFlag team={home} teamId={homeId} size="sm" compact />
          ) : (
            <span className={styles.dot} />
          )}
          <span>{teamDisplayName(home, match.homeSeedLabel ?? "TBD", match.homeSeedLabel)}</span>
          <CertaintyBadge certainty={homeCertainty} size="xs" />
        </div>
        <div className={`${styles.nodeTeam} ${awayCertainty === "confirmed" ? styles.nodeTeamConfirmed : ""}`.trim()}>
          {awayId ? (
            <TeamFlag team={away} teamId={awayId} size="sm" compact />
          ) : (
            <span className={styles.dot} />
          )}
          <span>{teamDisplayName(away, match.awaySeedLabel ?? "TBD", match.awaySeedLabel)}</span>
          <CertaintyBadge certainty={awayCertainty} size="xs" />
        </div>
      </div>
    </article>
  );
}

export function LiveBracketContextPanel({ liveMatch, bracket, teamsById, liveMatches }: Props) {
  const fixtureRegistry = buildFixtureRegistry();
  const canonicalMatchId =
    resolveFixtureRef(liveMatch, teamsById, fixtureRegistry) ??
    liveMatch.matchId ??
    liveMatch.id;
  const childId = findChildBracketMatchId(canonicalMatchId);
  if (!childId) return null;

  const byId = bracketById(bracket);
  const r16Match = byId.get(childId);
  const siblingId = siblingFeederMatchId(childId, canonicalMatchId);
  if (!r16Match || !siblingId) return null;

  const siblingBracket = byId.get(siblingId);
  const siblingDisplay = resolveFeederMatchDisplay(
    siblingId,
    siblingBracket,
    liveMatches,
    teamsById
  );
  const downstreamDisplay = resolveDownstreamSlotDisplay(r16Match, liveMatches, teamsById);
  const thisMatchDisplay = resolveFeederMatchDisplay(
    canonicalMatchId,
    byId.get(canonicalMatchId),
    liveMatches,
    teamsById
  );

  const roundLabel = STAGE_LABELS[r16Match.stage] ?? r16Match.stage;
  const siblingInfo = knockoutSchedule[siblingId];
  const siblingKickoff = siblingInfo
    ? formatKickoffLabel(resolveOfficialMatchKickoff({ matchId: siblingId, date: siblingInfo.date }))
    : siblingId;

  return (
    <section className={styles.panel} aria-label="Knockout path context">
      <div className={styles.flow}>
        <CtxMatchNode
          display={thisMatchDisplay.isLive ? thisMatchDisplay : { ...thisMatchDisplay, isLive: liveMatch.status === "live" }}
          teamsById={teamsById}
          label="This match"
        />
        <div className={styles.arrow} aria-hidden>
          →
        </div>
        <CtxRoundNode
          match={r16Match}
          slotDisplay={downstreamDisplay}
          teamsById={teamsById}
          roundLabel={roundLabel}
        />
      </div>

      <div className={styles.sibling}>
        <span className={styles.siblingLabel}>Opponent determined by</span>
        {siblingDisplay.homeTeamId || siblingDisplay.awayTeamId ? (
          <CtxMatchNode display={siblingDisplay} teamsById={teamsById} label={siblingKickoff} />
        ) : (
          <p className={styles.siblingFallback}>
            {siblingDisplay.homeTeamId
              ? teamDisplayNameFromId(siblingDisplay.homeTeamId, teamsById)
              : "TBD"}{" "}
            vs{" "}
            {siblingDisplay.awayTeamId
              ? teamDisplayNameFromId(siblingDisplay.awayTeamId, teamsById)
              : "TBD"}{" "}
            ({siblingKickoff})
          </p>
        )}
      </div>
    </section>
  );
}
