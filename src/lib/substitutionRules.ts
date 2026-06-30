/**
 * @rulesVersion — bound to tournamentRules.ts
 * @violates — ERR_004 substitution integrity and window arithmetic
 */

import type { MatchEvent } from "../types";
import { RULES, type TournamentRuleViolation } from "./tournamentRules";

export type SubstitutionAuditEvent = Pick<
  MatchEvent,
  "type" | "minute" | "playerName" | "playerId" | "teamId"
> & {
  concussionSub?: boolean;
};

export type SubstitutionAuditResult = {
  baseSubs: number;
  concussionSubs: number;
  windows: number;
  extraTimeSubs: number;
  violations: TournamentRuleViolation[];
};

const REGULATION_END = RULES.regulation.durationMinutes;
const HALFTIME_MINUTE = RULES.regulation.halfDurationMinutes;

function playerKey(event: SubstitutionAuditEvent): string {
  return `${event.teamId}::${event.playerId ?? event.playerName}`;
}

function isSubstitution(event: SubstitutionAuditEvent): boolean {
  return event.type === "substitution";
}

/** ERR_004 — player cannot be subbed twice unless one concussion exemption applies. */
export function validateSubstitutionEvents(
  events: SubstitutionAuditEvent[]
): TournamentRuleViolation | null {
  const subbedOut = new Map<string, { minute: number; concussion: boolean }>();
  const concussionUsed = new Set<string>();

  for (const event of events) {
    if (!isSubstitution(event)) continue;
    const key = playerKey(event);
    const concussion = event.concussionSub === true;
    const prior = subbedOut.get(key);

    if (!prior) {
      subbedOut.set(key, { minute: event.minute, concussion });
      if (concussion) concussionUsed.add(key);
      continue;
    }

    if (concussion && !concussionUsed.has(key)) {
      concussionUsed.add(key);
      continue;
    }

    return {
      code: "ERR_004",
      message: RULES.errors.ERR004,
      context: { player: event.playerName, minute: event.minute },
    };
  }

  return null;
}

function countSubstitutionWindows(events: SubstitutionAuditEvent[]): number {
  const regulationSubs = events.filter(
    (e) => isSubstitution(e) && e.minute <= REGULATION_END && e.minute !== HALFTIME_MINUTE
  );
  if (regulationSubs.length === 0) return 0;

  let windows = 1;
  let lastMinute = regulationSubs[0].minute;
  for (const sub of regulationSubs.slice(1)) {
    if (sub.minute - lastMinute > 5) {
      windows += 1;
    }
    lastMinute = sub.minute;
  }
  return windows;
}

/** Substitution arithmetic audit for regulation + extra time. */
export function auditSubstitutionCounts(
  events: SubstitutionAuditEvent[],
  inExtraTime = false
): SubstitutionAuditResult {
  const violations: TournamentRuleViolation[] = [];
  const err004 = validateSubstitutionEvents(events);
  if (err004) violations.push(err004);

  const regulationSubs = events.filter(
    (e) => isSubstitution(e) && e.minute <= REGULATION_END
  );
  const extraTimeSubs = events.filter(
    (e) => isSubstitution(e) && e.minute > REGULATION_END
  );

  const baseSubs = regulationSubs.filter((e) => e.concussionSub !== true).length;
  const concussionSubs = regulationSubs.filter((e) => e.concussionSub === true).length;
  const windows = countSubstitutionWindows(events);

  const maxBase = inExtraTime
    ? RULES.substitutions.base + RULES.substitutions.extraTimeBonus
    : RULES.substitutions.base;

  if (baseSubs > maxBase) {
    violations.push({
      code: "ERR_004",
      message: `Base substitutions exceed ${maxBase}`,
      context: { baseSubs, maxBase },
    });
  }

  if (!inExtraTime && windows > RULES.substitutions.maxWindows) {
    violations.push({
      code: "ERR_004",
      message: `Substitution windows exceed ${RULES.substitutions.maxWindows}`,
      context: { windows },
    });
  }

  if (inExtraTime && extraTimeSubs.length > RULES.substitutions.extraTimeBonus) {
    violations.push({
      code: "ERR_004",
      message: `Extra-time subs exceed ${RULES.substitutions.extraTimeBonus}`,
      context: { extraTimeSubs: extraTimeSubs.length },
    });
  }

  return {
    baseSubs,
    concussionSubs,
    windows,
    extraTimeSubs: extraTimeSubs.length,
    violations,
  };
}
