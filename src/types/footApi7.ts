import type { GroupStanding } from "../types";

export type FootApi7CacheStore = {
  version: 1;
  lastSyncAt: string | null;
  bundle: FootApi7Bundle | null;
};

export type FootApi7Bundle = {
  fetchedAt: string;
  tournamentId: number;
  seasonId: number;
  groups: unknown;
  standings: unknown;
  teams: unknown;
  rounds: unknown;
  knockout: unknown;
  /** Normalized group tables for the app. */
  groupStandings: GroupStanding[];
  unavailable: string[];
};
