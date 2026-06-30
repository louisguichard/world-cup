import rulesJson from "../data/tournamentRules.json";

/**
 * @rulesVersion — bound to tournamentRules.json
 * @violates — constitutional source for ERR_001–ERR_005 and anti-rematch invariants
 */

export type TournamentRuleCode =
  | "ERR_001"
  | "ERR_002"
  | "ERR_003"
  | "ERR_004"
  | "ERR_005"
  | "ANTI_REMATCH";

export type TournamentRuleViolation = {
  code: TournamentRuleCode;
  message: string;
  context?: Record<string, string | number | boolean | undefined>;
};

type TournamentRulesDocument = typeof rulesJson;

export const TOURNAMENT_RULES: TournamentRulesDocument = Object.freeze(
  structuredClone(rulesJson)
);

const { global_invariants, match_event_invariants, third_place_qualification_matrix } =
  TOURNAMENT_RULES;

/** Regulation length in minutes (90). */
export const REGULATION_MINUTES = global_invariants.regulation_time_minutes;

/** Each half of regulation (45). */
export const HALF_DURATION_MINUTES = global_invariants.half_duration_minutes;

/** Extra-time block length in minutes (30 total = 2 × 15). */
export const EXTRA_TIME_TOTAL_MINUTES =
  match_event_invariants.extra_time_protocol.total_duration_minutes;

/** Upper-bound playing time for knockout (regulation + full extra time). */
export const KNOCKOUT_MAX_PLAYING_MINUTES = REGULATION_MINUTES + EXTRA_TIME_TOTAL_MINUTES;

/** Typical stoppage-time buffer applied after regulation (group and knockout). */
export const STOPPAGE_BUFFER_MINUTES = 10;

/** Group stage: regulation + stoppage only — no extra time. */
export const GROUP_MAX_PLAYING_MINUTES = REGULATION_MINUTES + STOPPAGE_BUFFER_MINUTES;

/** Knockout: regulation + extra time + stoppage buffer. */
export const KNOCKOUT_MAX_PLAYING_MINUTES_WITH_BUFFER =
  KNOCKOUT_MAX_PLAYING_MINUTES + STOPPAGE_BUFFER_MINUTES;

export const MATCH_POINTS = Object.freeze({ ...global_invariants.base_points_allocation });

export const THIRD_PLACE_ADVANCEMENT_SLOTS =
  third_place_qualification_matrix.slots_available_for_advancement;

export const GROUP_TIEBREAKER_STEPS =
  TOURNAMENT_RULES.group_stage_engine.tiebreaker_hierarchy_sequential;

export const STRICT_STATE_DENIAL_RULES =
  match_event_invariants.strict_state_denial_rules;

export function ruleMessage(code: TournamentRuleCode): string {
  const found = STRICT_STATE_DENIAL_RULES.find((entry) => entry.id === code);
  if (found) return found.rule;
  if (code === "ANTI_REMATCH") {
    return third_place_qualification_matrix.anti_rematch_constraint;
  }
  return code;
}

const subRules = global_invariants.substitution_rules;
const extraTime = match_event_invariants.extra_time_protocol;
const penalties = match_event_invariants.penalty_shootout_protocol;
const knockout = TOURNAMENT_RULES.knockout_logic_engine;

/** Typed readonly RULES singleton — no magic numbers outside this module. */
export const RULES = Object.freeze({
  regulation: Object.freeze({
    durationMinutes: global_invariants.regulation_time_minutes,
    halves: global_invariants.halves_count,
    halfDurationMinutes: global_invariants.half_duration_minutes,
  }),
  points: Object.freeze({ ...global_invariants.base_points_allocation }),
  substitutions: Object.freeze({
    base: subRules.base_allowed_substitutions,
    maxWindows: subRules.maximum_substitution_windows_regulation,
    halftimeIsWindow: subRules.halftime_window_counts_as_window,
    extraTimeBonus: subRules.extra_time_additional_substitution,
    extraTimeWindowBonus: subRules.extra_time_additional_window,
    concussionCountsAgainstBase: subRules.concussion_substitution_counts_against_base,
    concussionAllowance: subRules.concussion_substitution_allowance,
  }),
  extraTime: Object.freeze({
    durationMinutes: extraTime.total_duration_minutes,
    halves: extraTime.halves_count,
    halfDurationMinutes: extraTime.half_duration_minutes,
    goldenGoal: extraTime.golden_goal_rule_active,
    mustCompleteFull30: extraTime.must_complete_full_30_minutes,
  }),
  penalties: Object.freeze({
    minInitialKicks: penalties.minimum_initial_kicks_per_team,
    format: "ABAB" as const,
  }),
  group: Object.freeze({
    teamsPerGroup: TOURNAMENT_RULES.group_stage_engine.teams_per_group,
    totalGroups: TOURNAMENT_RULES.group_stage_engine.group_count,
    totalMatches: TOURNAMENT_RULES.group_stage_engine.total_group_stage_matches,
  }),
  thirdPlace: Object.freeze({
    totalTeams: third_place_qualification_matrix.total_third_place_teams,
    advancingSlots: third_place_qualification_matrix.slots_available_for_advancement,
  }),
  knockout: Object.freeze({
    firstMatchNumber: 73,
    drawsPermitted: knockout.phase_rules.draws_permitted,
    requiresAbsoluteWinner: knockout.phase_rules.requires_absolute_winner,
  }),
  tiebreaker: Object.freeze([...GROUP_TIEBREAKER_STEPS]),
  errors: Object.freeze(
    Object.fromEntries(
      STRICT_STATE_DENIAL_RULES.map((entry) => [entry.id.replace("_", ""), entry.rule])
    ) as Record<"ERR001" | "ERR002" | "ERR003" | "ERR004" | "ERR005", string>
  ),
  matchLifecycle: Object.freeze({
    groupMatchMaxMinutes: GROUP_MAX_PLAYING_MINUTES,
    knockoutMatchMaxMinutes: KNOCKOUT_MAX_PLAYING_MINUTES_WITH_BUFFER,
  }),
});

export type KnockoutRoutingEntry = {
  matchNumber: number;
  homeSource: string;
  awaySource: string;
  targetMatchNext?: number;
  targetSlot?: string;
  targetWinnerNext?: number;
  targetLoserNext?: number;
  targetSlotWinner?: string;
  targetSlotLoser?: string;
  type?: string;
};

/** Flat knockout routing map from constitutional JSON (M73–M104). */
export function getKnockoutRoutingMap(): KnockoutRoutingEntry[] {
  const engine = TOURNAMENT_RULES.knockout_logic_engine;
  const rounds = [
    engine.round_of_32.matches,
    engine.round_of_16.matches,
    engine.quarter_finals.matches,
    engine.semi_finals.matches,
    engine.finals_phase.matches,
  ] as const;

  const entries: KnockoutRoutingEntry[] = [];
  for (const round of rounds) {
    for (const [key, spec] of Object.entries(round)) {
      entries.push({
        matchNumber: Number(key),
        homeSource: spec.home_source,
        awaySource: spec.away_source,
        targetMatchNext: "target_match_next" in spec ? spec.target_match_next : undefined,
        targetSlot: "target_slot" in spec ? spec.target_slot : undefined,
        targetWinnerNext: "target_winner_next" in spec ? spec.target_winner_next : undefined,
        targetLoserNext: "target_loser_next" in spec ? spec.target_loser_next : undefined,
        targetSlotWinner: "target_slot_winner" in spec ? spec.target_slot_winner : undefined,
        targetSlotLoser: "target_slot_loser" in spec ? spec.target_slot_loser : undefined,
        type: "type" in spec ? spec.type : undefined,
      });
    }
  }
  return entries;
}
