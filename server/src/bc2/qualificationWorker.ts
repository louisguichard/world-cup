/**
 * QualificationWorker — BC2 deterministic qualification engine.
 *
 * Hard invariant: this context is pure and deterministic.
 * - Input: locked match results + group standings from CanonicalStore
 * - Output: immutable QualificationSnapshot rows
 * - Zero probabilistic contamination — no reading from prediction store
 *
 * The existing qualification.ts logic from the React client is the reference
 * implementation. This worker wraps it with:
 * - Snapshot persistence (immutable, versioned)
 * - Input hashing (identical inputs → identical snapshots)
 * - Event emission (QualificationChangedEvent on tier/certainty changes)
 * - Engine versioning (snapshots carry engineVersion for audit replay)
 */

import crypto from "node:crypto";
import { prisma } from "../infra/prisma.js";
import { redis } from "../infra/redis.js";
import { STREAM_KEYS } from "../events/types.js";
import type {
  QualificationSnapshotCreated,
  QualificationChangedEvent,
  TeamAdvanced,
  TeamEliminated,
  MatchResultLockedEvent,
} from "../events/types.js";
import { computeGroupQualificationFromSharedEngine } from "./qualificationBridge.js";
import type {
  GroupQualification,
  LifeState,
  QualificationCertainty,
  QualificationTier,
  TeamStanding,
} from "./qualificationWorker.types.js";

export type {
  GroupQualification,
  LifeState,
  QualificationCertainty,
  QualificationTier,
  TeamStanding,
} from "./qualificationWorker.types.js";

// ─────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────

export const QUALIFICATION_ENGINE_VERSION = "2.0.0";

export class QualificationWorker {
  /**
   * Triggered by MatchResultLockedEvent.
   * Recomputes qualification for the affected group (and third-place ranking).
   * Writes an immutable snapshot and emits change events.
   */
  async processMatchLocked(event: MatchResultLockedEvent): Promise<void> {
    const { groupId } = event;
    if (!groupId) return; // knockout matches don't affect group qualification

    await this.recomputeGroup(groupId, event.matchId);

    // Third-place ranking spans all 12 groups — recompute after every locked result
    await this.recomputeThirdPlaceRanking();
  }

  /**
   * Recomputes qualification for a single group.
   * Reads standings from the canonical store, runs the deterministic engine,
   * persists the snapshot, and emits change events for any tier/certainty changes.
   */
  async recomputeGroup(groupId: string, decidingMatchId?: string): Promise<void> {
    const start = Date.now();

    // Load canonical standings for the group
    const standings = await this.loadGroupStandings(groupId);
    const matches = await this.loadGroupMatches(groupId);

    if (standings.length === 0) return;

    // Compute qualification using the shared client rules engine
    const qualifications = computeGroupQualificationFromSharedEngine(
      groupId,
      standings,
      matches.map((m) => ({
        id: m.id,
        groupId: m.groupId,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        resultLocked: m.resultLocked,
        kickoffUtc: m.kickoffUtc,
      }))
    );

    // Hash the input for idempotency guarantee
    const inputHash = hashInput({ standings, matches });

    // Check if this input was already computed
    const existingSnapshot = await prisma.qualificationSnapshot.findFirst({
      where: { groupId, inputHash, isScenario: false },
      orderBy: { createdAt: "desc" },
    });

    if (existingSnapshot) {
      return; // Identical input → identical output; skip
    }

    // Get the previous qualification state for change detection
    const previousSnapshots = await prisma.qualificationSnapshot.findMany({
      where: { groupId, isScenario: false },
      orderBy: { createdAt: "desc" },
      take: standings.length,
    });
    const prevByTeam = new Map(previousSnapshots.map((s) => [s.teamId, s]));

    // Persist new snapshot rows (immutable — insert only)
    const snapshotRows = qualifications.map((q) => ({
      groupId,
      teamId: q.teamId,
      tier: q.tier,
      certainty: q.certainty,
      lifeState: q.lifeState,
      projectionScore: q.projectionScore,
      reasons: q.reasons,
      engineVersion: QUALIFICATION_ENGINE_VERSION,
      inputHash,
      isScenario: false,
    }));

    await prisma.qualificationSnapshot.createMany({ data: snapshotRows });

    // Fetch the newly created snapshots (to get IDs)
    const newSnapshots = await prisma.qualificationSnapshot.findMany({
      where: { groupId, inputHash, isScenario: false },
      orderBy: { createdAt: "desc" },
      take: snapshotRows.length,
    });
    const snapshotId = newSnapshots[0]?.id ?? "unknown";

    // Emit snapshot created event
    const createdEvent: QualificationSnapshotCreated = {
      type: "QualificationSnapshotCreated",
      snapshotId,
      groupId,
      engineVersion: QUALIFICATION_ENGINE_VERSION,
      inputHash,
      createdAt: new Date().toISOString(),
    };
    await this.publishEvent(createdEvent);

    // Emit change events for tier/certainty changes
    for (const q of qualifications) {
      const prev = prevByTeam.get(q.teamId);
      const tierChanged = prev && prev.tier !== q.tier;
      const certaintyChanged = prev && prev.certainty !== q.certainty;

      if (tierChanged || certaintyChanged || !prev) {
        const changeEvent: QualificationChangedEvent = {
          type: "QualificationChangedEvent",
          teamId: q.teamId,
          groupId,
          previousTier: prev?.tier ?? null,
          newTier: q.tier,
          previousCertainty: prev?.certainty ?? null,
          newCertainty: q.certainty,
          decidingMatchId,
          changedAt: new Date().toISOString(),
        };
        await this.publishEvent(changeEvent);
      }

      // Emit advancement/elimination events
      if (q.certainty === "CONFIRMED") {
        if (q.lifeState === "ELIMINATED") {
          const elimEvent: TeamEliminated = {
            type: "TeamEliminated",
            teamId: q.teamId,
            eliminationMatchId: decidingMatchId ?? "unknown",
            knockoutBy: groupId,
          };
          await this.publishEvent(elimEvent);
        } else if (q.tier === "CHAMPION" || q.tier === "RUNNER_UP" || q.tier === "BEST_THIRD") {
          const advEvent: TeamAdvanced = {
            type: "TeamAdvanced",
            teamId: q.teamId,
            groupId,
            position: q.tier === "CHAMPION" ? 1 : q.tier === "RUNNER_UP" ? 2 : 3,
            confirmedAt: new Date().toISOString(),
          };
          await this.publishEvent(advEvent);
        }
      }
    }

    // Record latency metric
    const latencyMs = Date.now() - start;
    await redis.xadd(
      "wc2026:metrics",
      "*",
      "metric", "qual.recompute_latency_ms",
      "value", String(latencyMs),
      "groupId", groupId
    );
  }

  /**
   * Recomputes the best-third ranking across all groups.
   * Only runs after MatchResultLockedEvent (never for live scores).
   */
  async recomputeThirdPlaceRanking(): Promise<void> {
    const allGroups = await prisma.canonicalTeam.findMany({
      select: { groupId: true },
      distinct: ["groupId"],
      where: { groupId: { not: null } },
    });

    const thirdPlacers: Array<{ teamId: string; groupId: string; standing: TeamStanding }> = [];

    for (const { groupId } of allGroups) {
      if (!groupId) continue;
      const standings = await this.loadGroupStandings(groupId);
      const matches = await this.loadGroupMatches(groupId);

      if (standings.length < 3) continue;

      // Get the third-place team by current points
      const sorted = sortStandings(standings);
      if (sorted[2]) {
        thirdPlacers.push({
          teamId: sorted[2].teamId,
          groupId,
          standing: sorted[2],
        });
      }
    }

    // Rank all third-place teams using the FIFA 2026 best-third criteria
    const ranked = rankBestThirds(thirdPlacers.map((t) => t.standing));
    for (let i = 0; i < ranked.length; i++) {
      const team = ranked[i];
      if (team && i < 8) {
        // Top 8 third-place teams advance
        await prisma.qualificationSnapshot.create({
          data: {
            groupId: team.groupId,
            teamId: team.teamId,
            tier: "BEST_THIRD",
            certainty: "POSSIBLE",
            lifeState: "ALIVE",
            engineVersion: QUALIFICATION_ENGINE_VERSION,
            inputHash: hashInput({ ranked }),
            isScenario: false,
            reasons: [`Best third position: rank ${i + 1} of ${ranked.length}`],
          },
        });
      }
    }
  }

  /**
   * Returns the current qualification snapshot for a group.
   * Optionally as-of a specific timestamp (for historical audit).
   */
  async getSnapshot(
    groupId: string,
    asOf?: Date
  ): Promise<GroupQualification[]> {
    const where = {
      groupId,
      isScenario: false,
      ...(asOf ? { createdAt: { lte: asOf } } : {}),
    };

    // Get the most recent snapshot per team
    const teams = await prisma.canonicalTeam.findMany({
      where: { groupId },
      select: { id: true },
    });

    const results: GroupQualification[] = [];
    for (const { id: teamId } of teams) {
      const snapshot = await prisma.qualificationSnapshot.findFirst({
        where: { ...where, teamId },
        orderBy: { createdAt: "desc" },
      });
      if (snapshot) {
        results.push({
          teamId: snapshot.teamId,
          groupId: snapshot.groupId,
          tier: snapshot.tier as QualificationTier,
          certainty: snapshot.certainty as QualificationCertainty,
          lifeState: snapshot.lifeState as LifeState,
          projectionScore: snapshot.projectionScore ?? undefined,
          reasons: (snapshot.reasons as string[]) ?? [],
        });
      }
    }

    return results;
  }

  // ─────────────────────────────────────────────
  // Data loading from CanonicalStore
  // ─────────────────────────────────────────────

  private async loadGroupStandings(groupId: string): Promise<TeamStanding[]> {
    const teams = await prisma.canonicalTeam.findMany({
      where: { groupId },
    });

    const matches = await this.loadGroupMatches(groupId);

    // Compute standings from locked matches
    const standings = new Map<string, TeamStanding>();
    for (const team of teams) {
      standings.set(team.id, {
        teamId: team.id,
        groupId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        goalDifference: 0,
      });
    }

    for (const match of matches) {
      if (!match.resultLocked || match.homeScore === null || match.awayScore === null) {
        continue;
      }
      const home = standings.get(match.homeTeamId);
      const away = standings.get(match.awayTeamId);
      if (!home || !away) continue;

      const hs = match.homeScore;
      const as_ = match.awayScore;

      home.played++;
      away.played++;
      home.goalsFor += hs;
      home.goalsAgainst += as_;
      away.goalsFor += as_;
      away.goalsAgainst += hs;
      home.goalDifference = home.goalsFor - home.goalsAgainst;
      away.goalDifference = away.goalsFor - away.goalsAgainst;

      if (hs > as_) {
        home.won++;
        home.points += 3;
        away.lost++;
      } else if (hs === as_) {
        home.drawn++;
        home.points += 1;
        away.drawn++;
        away.points += 1;
      } else {
        away.won++;
        away.points += 3;
        home.lost++;
      }
    }

    return Array.from(standings.values());
  }

  private async loadGroupMatches(groupId: string) {
    return prisma.canonicalMatch.findMany({
      where: { groupId },
      orderBy: { kickoffUtc: "asc" },
    });
  }

  private async publishEvent(event: Record<string, unknown>): Promise<void> {
    await redis.xadd(
      STREAM_KEYS.qualification,
      "*",
      "type", String(event.type),
      "payload", JSON.stringify(event)
    );
    // Also publish to the push stream for client notification
    await redis.xadd(
      STREAM_KEYS.push,
      "*",
      "type", String(event.type),
      "payload", JSON.stringify(event)
    );
  }
}

function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return 0;
  });
}

function rankBestThirds(standings: TeamStanding[]): TeamStanding[] {
  return sortStandings(standings);
}

function hashInput(input: unknown): string {
  const str = JSON.stringify(input, Object.keys(input as object).sort());
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}
