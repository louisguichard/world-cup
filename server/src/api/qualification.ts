/**
 * Qualification API handlers — BC2 read layer.
 * Snapshots when present; compute-on-read via shared rules engine when not.
 */

import { prisma } from "../infra/prisma.js";
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from "../infra/redis.js";
import { computeGroupQualificationFromSharedEngine } from "../bc2/qualificationBridge.js";
import { QUALIFICATION_ENGINE_VERSION } from "../bc2/qualificationWorker.js";

export interface QualificationGroupResponse {
  groupId: string;
  asOf: string;
  source: "snapshot" | "computed";
  teams: Array<{
    teamId: string;
    tier: string;
    certainty: string;
    lifeState: string;
    projectionScore: number | null;
    reasons: string[];
    engineVersion: string;
  }>;
}

async function loadGroupStandingsForCompute(groupId: string) {
  const teams = await prisma.canonicalTeam.findMany({ where: { groupId } });
  const matches = await prisma.canonicalMatch.findMany({
    where: { groupId },
    orderBy: { kickoffUtc: "asc" },
  });

  const standings = new Map<
    string,
    {
      teamId: string;
      groupId: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
      goalDifference: number;
    }
  >();

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

  return {
    standings: Array.from(standings.values()),
    matches,
  };
}

async function computeLiveGroupQualification(
  groupId: string
): Promise<QualificationGroupResponse | null> {
  const { standings, matches } = await loadGroupStandingsForCompute(groupId);
  if (standings.length === 0) return null;

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

  return {
    groupId,
    asOf: new Date().toISOString(),
    source: "computed",
    teams: qualifications.map((q) => ({
      teamId: q.teamId,
      tier: q.tier,
      certainty: q.certainty,
      lifeState: q.lifeState,
      projectionScore: q.projectionScore ?? null,
      reasons: q.reasons,
      engineVersion: QUALIFICATION_ENGINE_VERSION,
    })),
  };
}

export async function getGroupQualification(
  groupId: string,
  asOf?: string
): Promise<QualificationGroupResponse | null> {
  const cKey = cacheKey("qualification", groupId, asOf ?? "latest");

  const cached = await cacheGet<QualificationGroupResponse>(cKey);
  if (cached) return cached;

  const asOfDate = asOf ? new Date(asOf) : undefined;

  const teams = await prisma.canonicalTeam.findMany({
    where: { groupId },
    select: { id: true },
  });

  if (teams.length === 0) {
    return computeLiveGroupQualification(groupId);
  }

  const snapshots = await Promise.all(
    teams.map(({ id: teamId }) =>
      prisma.qualificationSnapshot.findFirst({
        where: {
          groupId,
          teamId,
          isScenario: false,
          ...(asOfDate ? { createdAt: { lte: asOfDate } } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
    )
  );

  const validSnapshots = snapshots.filter(Boolean);

  if (validSnapshots.length === 0) {
    const computed = await computeLiveGroupQualification(groupId);
    if (computed) {
      await cacheSet(cKey, computed, CACHE_TTL.qualification);
    }
    return computed;
  }

  const response: QualificationGroupResponse = {
    groupId,
    asOf: asOf ?? new Date().toISOString(),
    source: "snapshot",
    teams: validSnapshots.map((s) => ({
      teamId: s!.teamId,
      tier: s!.tier,
      certainty: s!.certainty,
      lifeState: s!.lifeState,
      projectionScore: s!.projectionScore,
      reasons: (s!.reasons as string[]) ?? [],
      engineVersion: s!.engineVersion,
    })),
  };

  await cacheSet(cKey, response, asOf ? 3600 : CACHE_TTL.qualification);
  return response;
}

export async function getTeamQualificationHistory(teamId: string): Promise<
  Array<{
    snapshotId: string;
    tier: string;
    certainty: string;
    engineVersion: string;
    createdAt: string;
  }>
> {
  const snapshots = await prisma.qualificationSnapshot.findMany({
    where: { teamId, isScenario: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return snapshots.map((s) => ({
    snapshotId: s.id,
    tier: s.tier,
    certainty: s.certainty,
    engineVersion: s.engineVersion,
    createdAt: s.createdAt.toISOString(),
  }));
}
