import type { GroupLetter, Stage } from "../../types";

/** Lowercase FIFA abbrev catalog id (e.g. esp, fra). */
export type CanonicalTeamId = string;

/** Official schedule match id M1–M104. */
export type CanonicalMatchId = string;

export type TeamAliasKind = "espn" | "wc2026" | "fifa" | "sofa";

export type FixtureRegistryEntry = {
  canonicalId: CanonicalMatchId;
  espnEventId?: string;
  kickoffMs: number;
  homeTeamId: CanonicalTeamId;
  awayTeamId: CanonicalTeamId;
  stage?: Stage;
  group?: GroupLetter;
  venue?: string;
};

export type FixtureRegistry = {
  byMatchId: Map<CanonicalMatchId, FixtureRegistryEntry>;
  byEspnEventId: Map<string, CanonicalMatchId>;
  /** Sorted pair key → fixtures sharing that nation pairing (kickoff disambiguation). */
  byPair: Map<string, FixtureRegistryEntry[]>;
};

export type TeamRegistry = {
  espnTeamId: Map<string, CanonicalTeamId>;
  wc2026TeamId: Map<string, CanonicalTeamId>;
};
