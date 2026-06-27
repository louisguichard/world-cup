import type { GroupStanding, QualificationStatus, Team } from "../types";
import { uniqueCanonicalTeamIds } from "../data/wc2026TeamCatalog";
import {
  bucketQualificationTeams,
  buildQualificationContext,
  computeQualificationStatus,
  type QualificationBuckets,
  type QualificationMatchContext
} from "./qualification";
import { rankAliveBestThirds } from "./thirdPlaceQualification";
import { resolveQualificationDisplay, type QualificationDisplay } from "./qualificationDisplay";

/** User-facing precedence tier (display + live columns only — engine status unchanged). */
export type QualificationTierView = "qualified" | "alive" | "projected_out" | "eliminated";

export type QualificationLiveColumn = "moving_on" | "in_contention" | "out";

export type TeamQualificationView = {
  teamId: string;
  status: QualificationStatus;
  tier: QualificationTierView;
  liveColumn: QualificationLiveColumn;
  display: QualificationDisplay;
  bestThirdRank?: number;
};

export type LiveQualificationLayout = {
  movingOn: {
    confirmed: string[];
    projected: string[];
  };
  inContention: {
    alive: string[];
    projectedOut: string[];
  };
  out: {
    confirmed: string[];
  };
};

export function deriveQualificationTierView(status: QualificationStatus): QualificationTierView {
  if (status.status === "qualified") return "qualified";
  if (status.status === "eliminated" || !status.canQualify) return "eliminated";
  if (status.status === "projected_out") return "projected_out";
  return "alive";
}

export function deriveLiveColumn(tier: QualificationTierView): QualificationLiveColumn {
  switch (tier) {
    case "qualified":
      return "moving_on";
    case "alive":
    case "projected_out":
      return "in_contention";
    case "eliminated":
      return "out";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}

export function buildTeamQualificationView(
  teamId: string,
  standings: GroupStanding[],
  context: QualificationMatchContext,
  bestThirdRank?: number
): TeamQualificationView {
  const status = computeQualificationStatus(teamId, standings, context);
  const tier = deriveQualificationTierView(status);
  return {
    teamId,
    status,
    tier,
    liveColumn: deriveLiveColumn(tier),
    display: resolveQualificationDisplay(status),
    bestThirdRank
  };
}

export function buildQualificationViews(
  teamIds: string[],
  standings: GroupStanding[],
  context: QualificationMatchContext
): Map<string, TeamQualificationView> {
  const ranked = rankAliveBestThirds(standings, context);
  const bestThirdRankById = new Map(ranked.map((row, index) => [row.teamId, index + 1]));
  const views = new Map<string, TeamQualificationView>();

  for (const teamId of teamIds) {
    views.set(
      teamId,
      buildTeamQualificationView(teamId, standings, context, bestThirdRankById.get(teamId))
    );
  }

  return views;
}

export function buildQualificationViewsForTeams(
  teams: Record<string, Team>,
  standings: GroupStanding[],
  context: QualificationMatchContext
): Map<string, TeamQualificationView> {
  return buildQualificationViews(uniqueCanonicalTeamIds(teams), standings, context);
}

export function buildLiveQualificationLayout(
  views: Map<string, TeamQualificationView>,
  buckets: QualificationBuckets
): LiveQualificationLayout {
  const alive: string[] = [];
  const projectedOut: string[] = [];

  for (const view of views.values()) {
    if (view.liveColumn !== "in_contention") continue;
    if (view.tier === "projected_out") projectedOut.push(view.teamId);
    else alive.push(view.teamId);
  }

  return {
    movingOn: {
      confirmed: [...buckets.confirmedThrough],
      projected: buckets.projectedThrough.filter((id) => !buckets.confirmedThrough.includes(id))
    },
    inContention: { alive, projectedOut },
    out: { confirmed: [...buckets.confirmedOut, ...buckets.projectedOut] }
  };
}

export function buildQualificationSnapshot(
  teams: Record<string, Team>,
  standings: GroupStanding[],
  matches: Array<{ group?: string; locked?: boolean; homeScore?: number; awayScore?: number }>
) {
  const teamIds = uniqueCanonicalTeamIds(teams);
  const context = buildQualificationContext(
    matches as Parameters<typeof buildQualificationContext>[0],
    Object.values(teams)
  );
  const buckets = bucketQualificationTeams(teamIds, standings, context);
  const views = buildQualificationViews(teamIds, standings, context);
  const layout = buildLiveQualificationLayout(views, buckets);
  return { teamIds, context, buckets, views, layout };
}

/** Ensures no team appears in more than one live column. */
export function assertLiveColumnMutualExclusion(layout: LiveQualificationLayout): void {
  const movingOn = new Set([...layout.movingOn.confirmed, ...layout.movingOn.projected]);
  const contention = new Set([...layout.inContention.alive, ...layout.inContention.projectedOut]);
  const out = new Set(layout.out.confirmed);

  for (const teamId of contention) {
    if (movingOn.has(teamId)) {
      throw new Error(`Live column violation: ${teamId} is both moving on and in contention`);
    }
    if (out.has(teamId)) {
      throw new Error(`Live column violation: ${teamId} is both in contention and out`);
    }
  }

  for (const teamId of movingOn) {
    if (out.has(teamId)) {
      throw new Error(`Live column violation: ${teamId} is both moving on and out`);
    }
  }
}

/** Display tier must not contradict live column (e.g. qualified badge in out column). */
export function assertViewDisplayConsistency(views: Map<string, TeamQualificationView>): void {
  for (const view of views.values()) {
    const { display, liveColumn, tier } = view;
    if (liveColumn === "out" && display.variant.includes("qualified")) {
      throw new Error(`Display violation: ${view.teamId} shows qualified in out column`);
    }
    if (liveColumn === "moving_on" && tier === "eliminated") {
      throw new Error(`Display violation: ${view.teamId} is eliminated in moving-on column`);
    }
    if (liveColumn === "moving_on" && tier === "projected_out") {
      throw new Error(`Display violation: ${view.teamId} is projected out in moving-on column`);
    }
  }
}
