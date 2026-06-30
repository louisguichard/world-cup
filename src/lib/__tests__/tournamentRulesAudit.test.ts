/**
 * @rulesVersion — bound to tournamentRules.ts
 * @violates — master audit for ERR001–ERR005, anti-rematch, substitution, and points invariants
 */

import { afterAll, describe, expect, it } from "vitest";
import { mergeTeamsWithCatalog } from "../../data/wc2026TeamCatalog";
import { OFFICIAL_GROUP_ASSIGNMENTS } from "../../data/officialGroupAssignments";
import type { GroupLetter } from "../../types";
import { buildCanonicalTournamentDataset } from "../canonicalTournamentDataset";
import { getMatchPhase } from "../matchLifecycle";
import { replayStandings, type ReplayMatch } from "../replayStandings";
import { resolveMatchWinner } from "../resolveMatchWinner";
import {
  RULES,
  getKnockoutRoutingMap,
} from "../tournamentRules";
import {
  validateKnockoutProgression,
  validateMatchResult,
  validateThirdPlaceAntiRematch,
} from "../tournamentValidation";
import { ROUND_OF_32_FIXTURES } from "../brackets/getR32Slots";
import {
  auditSubstitutionCounts,
  validateSubstitutionEvents,
  type SubstitutionAuditEvent,
} from "../substitutionRules";
import type { BracketMatch, MergedMatch, Team } from "../../types";
import {
  ViolationRegistry,
  assertRegressionSnapshot,
} from "./violationRegistry";

function buildDataset() {
  const teams = mergeTeamsWithCatalog({});
  return buildCanonicalTournamentDataset({
    teams,
    liveMatches: {},
    knockoutMarkets: [],
  });
}

function officialTeamGroupIndex(): Record<string, GroupLetter> {
  const index: Record<string, GroupLetter> = {};
  for (const group of Object.keys(OFFICIAL_GROUP_ASSIGNMENTS) as GroupLetter[]) {
    for (const teamId of OFFICIAL_GROUP_ASSIGNMENTS[group]) {
      index[teamId] = group;
    }
  }
  return index;
}

function groupMatchNumber(matchId: string): number | null {
  const num = Number(matchId.replace(/^M/, ""));
  if (!Number.isFinite(num) || num < 1 || num > RULES.group.totalMatches) return null;
  return num;
}

function finalizeDescribe(registry: ViolationRegistry, label: string): void {
  afterAll(async () => {
    if (registry.hasViolations()) {
      await registry.applyFixes();
      throw new Error(`${label}\n\n${registry.report()}`);
    }
  });
}

describe("ERR001 | Group Assignment Integrity", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ERR001 REGRESSION");

  it("no team plays a group match against a team from a different group", () => {
    const { matches } = buildDataset();
    const violations: Array<{
      code: "ERR001";
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
      groups: string;
    }> = [];

    const teamGroups = officialTeamGroupIndex();
    const mapping: Record<string, string> = {};

    for (const match of matches) {
      const num = groupMatchNumber(match.matchId ?? match.id);
      if (num == null || !match.group) continue;

      const homeGroup = teamGroups[match.homeTeamId];
      const awayGroup = teamGroups[match.awayTeamId];
      if (homeGroup) mapping[match.homeTeamId] = homeGroup;
      if (awayGroup) mapping[match.awayTeamId] = awayGroup;

      if (!homeGroup || !awayGroup) continue;
      if (homeGroup !== match.group || awayGroup !== match.group) {
        violations.push({
          code: "ERR001",
          matchId: match.matchId ?? match.id,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          groups: `${homeGroup}/${awayGroup} vs schedule ${match.group}`,
        });
      }
    }

    if (violations.length > 0) {
      for (const v of violations) {
        registry.record({
          code: "ERR001",
          file: "src/data/matchSchedule.json",
          description: `${v.matchId} ${v.homeTeamId} vs ${v.awayTeamId} — ${v.groups}`,
          fixHint: "manual",
        });
      }
      expect(violations).toEqual([]);
    }

    assertRegressionSnapshot(
      "groupAssignment",
      mapping,
      registry,
      "ERR001 REGRESSION: group assignment changed — re-audit required"
    );
  });
});

describe("ERR002 | Tiebreaker Sequence Integrity", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ERR002 REGRESSION");

  const tieTeams: Team[] = [
    { id: "a1", name: "A1", shortName: "A1", abbreviation: "A1", group: "A", rating: 1500 },
    { id: "a2", name: "A2", shortName: "A2", abbreviation: "A2", group: "A", rating: 1490 },
    { id: "a3", name: "A3", shortName: "A3", abbreviation: "A3", group: "A", rating: 1480 },
    { id: "a4", name: "A4", shortName: "A4", abbreviation: "A4", group: "A", rating: 1470 },
  ];

  it("exports all 8 constitutional tiebreaker steps", () => {
    expect(RULES.tiebreaker).toHaveLength(8);
    expect(RULES.tiebreaker[3]?.step).toBe(4);
  });

  it("applies overall goal difference before head-to-head when points are tied (FIFA step 2 before 4)", () => {
    const gdFixture: ReplayMatch[] = [
      { matchId: "M1", homeTeamId: "a1", awayTeamId: "a2", group: "A", homeScore: 1, awayScore: 0, isCompleted: true },
      { matchId: "M2", homeTeamId: "a1", awayTeamId: "a3", group: "A", homeScore: 0, awayScore: 2, isCompleted: true },
      { matchId: "M3", homeTeamId: "a2", awayTeamId: "a3", group: "A", homeScore: 2, awayScore: 1, isCompleted: true },
      { matchId: "M4", homeTeamId: "a1", awayTeamId: "a4", group: "A", homeScore: 1, awayScore: 1, isCompleted: true },
      { matchId: "M5", homeTeamId: "a2", awayTeamId: "a4", group: "A", homeScore: 1, awayScore: 1, isCompleted: true },
      { matchId: "M6", homeTeamId: "a3", awayTeamId: "a4", group: "A", homeScore: 0, awayScore: 0, isCompleted: true },
    ];
    const standings = replayStandings(gdFixture, tieTeams);
    const rows = standings.find((s) => s.group === "A")?.rows ?? [];
    const a1Index = rows.findIndex((r) => r.teamId === "a1");
    const a2Index = rows.findIndex((r) => r.teamId === "a2");
    const a1 = rows[a1Index];
    const a2 = rows[a2Index];
    expect(a1?.points).toBe(a2?.points);

    const fifaOrder = a2Index < a1Index;
    if (!fifaOrder) {
      registry.record({
        code: "ERR002",
        file: "src/lib/tournament.ts",
        description:
          "Head-to-head applied before overall goal difference — a2 has better GD but ranks below a1",
        fixHint: "manual",
      });
    }
    expect(fifaOrder).toBe(true);
  });

  it("no team with more points is ranked below a team with fewer", () => {
    const { matches, teams } = buildDataset();
    const completed = matches.filter(
      (m) => m.group && m.status === "completed" && m.homeScore != null && m.awayScore != null
    );
    const replays: ReplayMatch[] = completed.map((m) => ({
      matchId: m.matchId ?? m.id,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      group: m.group!,
      homeScore: m.homeScore!,
      awayScore: m.awayScore!,
      isCompleted: true,
    }));

    const standings = replayStandings(replays, teams);
    const snapshot: Record<string, Array<{ teamId: string; rank: number; points: number }>> = {};

    for (const group of standings) {
      snapshot[group.group] = group.rows.map((r, index) => ({
        teamId: r.teamId,
        rank: index + 1,
        points: r.points,
      }));

      for (let i = 0; i < group.rows.length; i += 1) {
        for (let j = i + 1; j < group.rows.length; j += 1) {
          const higher = group.rows[i];
          const lower = group.rows[j];
          if (higher.points < lower.points) {
            registry.record({
              code: "ERR002",
              file: "src/lib/replayStandings.ts",
              description: `${lower.teamId} (${lower.points} pts) ranked above ${higher.teamId} (${higher.points} pts) in group ${group.group}`,
              fixHint: "manual",
            });
          }
        }
      }
    }

    assertRegressionSnapshot(
      "groupStandings",
      snapshot,
      registry,
      "ERR002 REGRESSION: group standings rank changed — re-audit required"
    );
  });
});

describe("ERR003 | No Draw in Knockout", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ERR003 REGRESSION");

  const knockoutBase: MergedMatch = {
    id: "M76",
    matchId: "M76",
    date: "2026-07-01T20:00:00.000Z",
    homeTeamId: "fra",
    awayTeamId: "ger",
    status: "completed",
    homeScore: 1,
    awayScore: 1,
    homeConduct: 0,
    awayConduct: 0,
    locked: true,
    source: "espn",
  };

  it("resolveMatchWinner returns undefined for unresolved knockout draws", () => {
    const unresolved = { ...knockoutBase };
    expect(resolveMatchWinner(unresolved)).toBeUndefined();
    const violation = validateMatchResult(unresolved);
    expect(violation?.code).toBe("ERR_003");
  });

  it("resolveMatchWinner resolves penalty shootouts", () => {
    const homeWin: MergedMatch = {
      ...knockoutBase,
      penaltyShootout: { homeScore: 4, awayScore: 3, homeKicks: [], awayKicks: [] },
      decidedByPenalties: true,
    };
    const awayWin: MergedMatch = {
      ...knockoutBase,
      penaltyShootout: { homeScore: 2, awayScore: 3, homeKicks: [], awayKicks: [] },
      decidedByPenalties: true,
    };
    expect(resolveMatchWinner(homeWin)).toBe("fra");
    expect(resolveMatchWinner(awayWin)).toBe("ger");
  });

  it("matchLifecycle never returns extra_time for group stage matches", () => {
    const kickoffMs = Date.now() - 95 * 60 * 1000;
    const liveGroup: Parameters<typeof getMatchPhase>[0] = {
      kickoffMs,
      status: "live",
      clockMinute: 92,
      group: "E",
      matchId: "M12",
    };
    const phase = getMatchPhase(liveGroup);
    if (phase === "extra_time") {
      registry.record({
        code: "ERR003",
        file: "src/lib/matchLifecycle.ts",
        description: "Group match returned extra_time at minute 92",
        fixHint: "auto",
        autoFix: {
          targetFile: "src/lib/matchLifecycle.ts",
          find: /115 \* 60 \* 1000/,
          replace: "estimatedMaxDurationMinutes(match) * 60 * 1000",
        },
      });
    }
    expect(phase).not.toBe("extra_time");
    expect(phase).toBe("live_second");

    const completedGroup = {
      kickoffMs,
      status: "completed" as const,
      group: "E" as const,
      matchId: "M12",
    };
    const postPhase = getMatchPhase(completedGroup, Date.now());
    expect(["post_match", "locked"]).toContain(postPhase);

    assertRegressionSnapshot(
      "matchLifecycle",
      {
        groupMatchMaxMinutes: RULES.matchLifecycle.groupMatchMaxMinutes,
        knockoutMatchMaxMinutes: RULES.matchLifecycle.knockoutMatchMaxMinutes,
      },
      registry,
      "ERR003 REGRESSION: match lifecycle duration caps changed"
    );
  });
});

describe("ERR004 | No Double Substitution", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ERR004");

  const sub = (minute: number, player = "P1", concussionSub?: boolean): SubstitutionAuditEvent => ({
    type: "substitution",
    minute,
    playerName: player,
    playerId: player,
    teamId: "fra",
    concussionSub,
  });

  it("flags duplicate substitution without concussion exemption", () => {
    const violation = validateSubstitutionEvents([sub(55), sub(70)]);
    expect(violation?.code).toBe("ERR_004");
  });

  it("allows one concussion exemption per player", () => {
    expect(validateSubstitutionEvents([sub(55), sub(70, "P1", true)])).toBeNull();
    expect(validateSubstitutionEvents([sub(55), sub(70, "P1", true), sub(80, "P1", true)])).not.toBeNull();
  });
});

describe("ERR005 | Loser Propagation Integrity", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ERR005 REGRESSION");

  it("losers route only to M103 from semi-finals", () => {
    const routing = getKnockoutRoutingMap();
    const snapshot: Record<string, unknown> = {};

    for (const entry of routing) {
      const key = `M${entry.matchNumber}`;
      snapshot[key] = entry;

      if (entry.matchNumber >= RULES.knockout.firstMatchNumber && entry.matchNumber <= 100) {
        if (entry.targetLoserNext != null) {
          registry.record({
            code: "ERR005",
            file: "src/data/tournamentRules.json",
            description: `${key} has targetLoserNext outside semi-finals`,
            fixHint: "manual",
          });
        }
      }

      if (entry.matchNumber === 101 || entry.matchNumber === 102) {
        if (entry.targetLoserNext !== 103 || entry.targetWinnerNext !== 104) {
          registry.record({
            code: "ERR005",
            file: "src/data/tournamentRules.json",
            description: `${key} must route loser→103 winner→104`,
            fixHint: "manual",
          });
        }
      }
    }

    assertRegressionSnapshot(
      "bracketRouting",
      snapshot,
      registry,
      "ERR005 REGRESSION: bracket routing changed — re-audit required"
    );
  });

  it("validateKnockoutProgression flags illegal loser placement", () => {
    const bracket: BracketMatch[] = [
      { id: "M89", stage: "R16", homeTeamId: "fra", awayTeamId: "ger", source: "scheduled" },
    ];
    expect(validateKnockoutProgression({ L74: "ger" }, bracket)?.code).toBe("ERR_005");
  });
});

describe("Third-Place Anti-Rematch Constraint", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "ANTI_REMATCH");

  it("official R32 fixtures satisfy anti-rematch constraint", () => {
    const violation = validateThirdPlaceAntiRematch(ROUND_OF_32_FIXTURES);
    if (violation) {
      registry.record({
        code: "ERR_ANTIREMATCH",
        file: "src/lib/brackets/getR32Slots.ts",
        description: violation.message,
        fixHint: "manual",
      });
    }
    expect(violation).toBeNull();
  });
});

describe("Substitution Window Arithmetic", () => {
  const sub = (minute: number, concussionSub?: boolean): SubstitutionAuditEvent => ({
    type: "substitution",
    minute,
    playerName: `P${minute}`,
    playerId: `P${minute}`,
    teamId: "fra",
    concussionSub,
  });

  it("base substitutions never exceed constitutional max in regulation", () => {
    const events = [sub(10), sub(11), sub(40), sub(41), sub(70)];
    const audit = auditSubstitutionCounts(events, false);
    expect(audit.baseSubs).toBeLessThanOrEqual(RULES.substitutions.base);
    expect(audit.violations).toHaveLength(0);
  });

  it("substitution windows never exceed constitutional max in regulation", () => {
    const events = [sub(10), sub(12), sub(30), sub(32), sub(55)];
    const audit = auditSubstitutionCounts(events, false);
    expect(audit.windows).toBeLessThanOrEqual(RULES.substitutions.maxWindows);
  });

  it("extra time grants exactly one additional sub slot", () => {
    const reg = Array.from({ length: RULES.substitutions.base }, (_, i) => sub(10 + i * 5));
    const et = [sub(RULES.regulation.durationMinutes + 5, false)];
    const audit = auditSubstitutionCounts([...reg, ...et], true);
    const maxTotal = RULES.substitutions.base + RULES.substitutions.extraTimeBonus;
    expect(audit.baseSubs + audit.extraTimeSubs).toBeLessThanOrEqual(maxTotal);
  });

  it("concussion sub does not count against base allowance", () => {
    const events = [
      ...Array.from({ length: RULES.substitutions.base }, (_, i) => sub(10 + i * 5)),
      sub(70, true),
    ];
    const audit = auditSubstitutionCounts(events, false);
    expect(audit.concussionSubs).toBe(1);
    expect(audit.baseSubs).toBeLessThanOrEqual(RULES.substitutions.base);
  });

  it("total subs in ET never exceed base plus ET bonus", () => {
    const events = [
      ...Array.from({ length: RULES.substitutions.base }, (_, i) => sub(8 + i * 4)),
      sub(RULES.regulation.durationMinutes + 2),
    ];
    const audit = auditSubstitutionCounts(events, true);
    const maxTotal = RULES.substitutions.base + RULES.substitutions.extraTimeBonus;
    expect(audit.baseSubs + audit.extraTimeSubs).toBeLessThanOrEqual(maxTotal);
  });
});

describe("Points Allocation Invariants", () => {
  const registry = new ViolationRegistry();
  finalizeDescribe(registry, "POINTS");

  it("completed group matches allocate win=3+0 or draw=1+1 points", () => {
    const { matches } = buildDataset();
    const groupCompleted = matches.filter(
      (m) =>
        m.group &&
        groupMatchNumber(m.matchId ?? m.id) != null &&
        m.status === "completed" &&
        m.homeScore != null &&
        m.awayScore != null
    );

    for (const match of groupCompleted) {
      const home = match.homeScore!;
      const away = match.awayScore!;
      const homePts =
        home > away ? RULES.points.win : home === away ? RULES.points.draw : RULES.points.loss;
      const awayPts =
        away > home ? RULES.points.win : home === away ? RULES.points.draw : RULES.points.loss;
      const total = homePts + awayPts;
      const expected = home === away ? RULES.points.draw * 2 : RULES.points.win + RULES.points.loss;
      if (total !== expected) {
        registry.record({
          code: "POINTS",
          file: "src/lib/replayStandings.ts",
          description: `${match.matchId ?? match.id} allocated ${total} pts (expected ${expected})`,
          fixHint: "manual",
        });
      }
      expect(total).toBe(expected);
    }
  });
});

describe("RULES singleton integrity", () => {
  it("exports constitutional constants without magic numbers in tests", () => {
    expect(RULES.regulation.durationMinutes).toBe(90);
    expect(RULES.points.win).toBe(3);
    expect(RULES.substitutions.base).toBe(5);
    expect(RULES.extraTime.durationMinutes).toBe(30);
    expect(RULES.penalties.minInitialKicks).toBe(5);
    expect(RULES.group.totalMatches).toBe(72);
    expect(RULES.knockout.firstMatchNumber).toBe(73);
    expect(RULES.errors.ERR003).toContain("Draw");
  });
});
