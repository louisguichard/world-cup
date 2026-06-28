import type { GroupStanding, MatchEvent, MergedMatch, Team } from "../types";
import { rankAliveBestThirds } from "./bestThirds";
import { buildRankingTimeline, type RankingSnapshot } from "./buildRankingTimeline";
import { computeQualificationStatus } from "./qualification";
import { teamDisplayNameFromId } from "./matchTeamDisplay";
import { teamDisplayName } from "./teamIdentity";
import type { QualificationMatchContext } from "./thirdPlaceQualification";

export type EliminationStoryConfidence = "full" | "partial" | "unknown";

export type EliminationTimelineEntry = {
  label: string;
  matchId: string;
};

export type EliminationStory = {
  confidence: EliminationStoryConfidence;
  decidingMatchId?: string;
  decidingLabel?: string;
  reason?: string;
  aliveSpan?: string;
  knownFacts: string[];
  timeline: EliminationTimelineEntry[];
  partialLead?: string;
};

export type BuildEliminationStoryInput = {
  teamId: string;
  team: Team;
  matches: MergedMatch[];
  teams: Team[];
  matchEvents: Record<string, MatchEvent[]>;
  standings: GroupStanding[];
  qualContext: QualificationMatchContext;
};

function formatDecidingLabel(snapshot: RankingSnapshot, teams: Team[]): string {
  const teamsById: Record<string, Team> = Object.fromEntries(teams.map((t) => [t.id, t]));
  const home = teamDisplayNameFromId(snapshot.homeTeamId, teamsById);
  const away = teamDisplayNameFromId(snapshot.awayTeamId, teamsById);
  return `${snapshot.label || `${home} ${snapshot.homeScore}–${snapshot.awayScore} ${away}`}`;
}

function buildKnownFacts(
  teamId: string,
  team: Team,
  standings: GroupStanding[],
  qualContext: QualificationMatchContext
): string[] {
  const facts: string[] = [];
  const qual = computeQualificationStatus(teamId, standings, qualContext);

  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx >= 0) {
      const row = group.rows[idx]!;
      facts.push(
        `Finished group stage path: ${idx + 1}${idx === 0 ? "st" : idx === 1 ? "nd" : idx === 2 ? "rd" : "th"} in Group ${group.group} with ${row.points} pts, ${row.goalDifference >= 0 ? "+" : ""}${row.goalDifference} GD.`
      );
      break;
    }
  }

  const thirdRanked = rankAliveBestThirds(standings, qualContext);
  const thirdIdx = thirdRanked.findIndex((r) => r.teamId === teamId);
  if (thirdIdx >= 0) {
    facts.push(`Best-third rank among alive teams: #${thirdIdx + 1} (top 8 advance).`);
  }

  if (qual.reason) facts.push(qual.reason);
  if (qual.eliminationReason && qual.eliminationReason !== qual.reason) {
    facts.push(qual.eliminationReason);
  }

  facts.push(`${team.name} cannot reach a qualifying spot with any remaining results.`);

  return facts;
}

/** Derive elimination narrative from timeline replay and qualification engine. */
export function buildEliminationStory(input: BuildEliminationStoryInput): EliminationStory | null {
  const { teamId, team, standings, qualContext } = input;
  const presentQual = computeQualificationStatus(teamId, standings, qualContext);

  if (presentQual.canQualify && presentQual.lifeState !== "eliminated") {
    return null;
  }

  const timeline = buildRankingTimeline({
    matches: input.matches,
    teams: input.teams,
    matchEvents: input.matchEvents,
    presentStandings: standings,
    presentQualContext: qualContext,
  });

  const eventSnapshots = timeline.filter((s) => s.type !== "present");
  let firstElimSnapshot: RankingSnapshot | null = null;
  let lastAliveSnapshot: RankingSnapshot | null = null;
  let aliveCount = 0;

  for (const snapshot of eventSnapshots) {
    const rankIdx = snapshot.rankings.findIndex((r) => r.teamId === teamId);
    const rankNum = rankIdx >= 0 ? rankIdx + 1 : 999;
    const inCutoff = rankNum <= 8;
    const crossedOut = snapshot.deltas.find(
      (d) => d.teamId === teamId && d.crossedCutoff === "out"
    );

    if (inCutoff || rankIdx >= 0) {
      lastAliveSnapshot = snapshot;
      aliveCount += 1;
    }

    if ((crossedOut || (!inCutoff && rankIdx >= 0)) && !firstElimSnapshot && !presentQual.canQualify) {
      if (crossedOut || snapshot.type === "final-whistle" || snapshot.type === "goal") {
        firstElimSnapshot = snapshot;
      }
    }
  }

  const knownFacts = buildKnownFacts(teamId, team, standings, qualContext);
  const timelineEntries: EliminationTimelineEntry[] = eventSnapshots
    .filter((s) =>
      s.deltas.some(
        (d) => d.teamId === teamId && (d.crossedCutoff || d.positionBefore !== d.positionAfter)
      )
    )
    .slice(-5)
    .map((s) => ({ label: s.shortLabel || s.label, matchId: s.matchId }));

  if (firstElimSnapshot && firstElimSnapshot.matchId) {
    const decidingLabel = formatDecidingLabel(firstElimSnapshot, input.teams);
    const reason =
      presentQual.eliminationReason ??
      presentQual.reason ??
      "the standings no longer allow a path into the round of 32.";
    const aliveSpan =
      aliveCount > 1
        ? `${aliveCount} key ranking updates`
        : lastAliveSnapshot?.shortLabel ?? "the group stage";

    return {
      confidence: "full",
      decidingMatchId: firstElimSnapshot.matchId,
      decidingLabel,
      reason,
      aliveSpan,
      knownFacts,
      timeline: timelineEntries,
    };
  }

  if (!presentQual.canQualify) {
    return {
      confidence: "partial",
      knownFacts,
      timeline: timelineEntries,
      partialLead: undefined,
      reason: presentQual.eliminationReason ?? presentQual.reason,
    };
  }

  return {
    confidence: "unknown",
    knownFacts,
    timeline: [],
  };
}
