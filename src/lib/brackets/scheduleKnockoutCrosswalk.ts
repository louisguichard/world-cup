/**
 * Legacy bracket-graph M## → FIFA schedule M## (ESPN-aligned).
 * Pre–build-60 bracket JSON used permuted match numbers; live cache rows may still
 * reference legacy ids until cleared or migrated via ESPN event id.
 */
export const LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID: Readonly<Record<string, string>> =
  Object.freeze({
    M73: "M79",
    M74: "M85",
    M75: "M82",
    M76: "M75",
    M77: "M81",
    M78: "M78",
    M79: "M88",
    M80: "M80",
    M81: "M73",
    M82: "M86",
    M83: "M84",
    M84: "M83",
    M85: "M74",
    M86: "M76",
    M87: "M87",
    M88: "M77",
  });

export const SCHEDULE_TO_LEGACY_BRACKET_MATCH_ID: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID).map(([legacy, schedule]) => [
        schedule,
        legacy,
      ])
    )
  );

/** Map a stored match id to the current FIFA schedule canonical id when known. */
export function toScheduleMatchId(matchId: string | undefined): string | undefined {
  if (!matchId) return undefined;
  return LEGACY_BRACKET_TO_SCHEDULE_MATCH_ID[matchId] ?? matchId;
}
