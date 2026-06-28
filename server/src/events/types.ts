/**
 * WC2026 Event Catalog — shared contracts across all bounded contexts.
 * These are the durable events that flow through the Redis Streams event bus.
 */

export type AuthorityLevel =
  | "PRIMARY"
  | "BACKUP"
  | "COMPUTED"
  | "ANALYST_OVERRIDE";

export interface SourceTrace {
  field: string;
  providerId: string;
  externalId: string;
  value: unknown;
  authority: AuthorityLevel;
  assertedAt: string;
}

// ─────────────────────────────────────────────
// BC1 — Intake & Reconciliation Events
// ─────────────────────────────────────────────

export interface RawProviderEventMsg {
  type: "RawProviderEvent";
  providerId: string;
  entityType: EntityType;
  externalId?: string;
  payload: unknown;
  schemaVersion: string;
  ingestedAt: string;
}

export interface ProviderSchemaViolation {
  type: "ProviderSchemaViolation";
  providerId: string;
  entityType: EntityType;
  violations: string[];
  rawPayloadSnapshot: unknown;
  occurredAt: string;
}

export interface IdentityResolved {
  type: "IdentityResolved";
  externalId: string;
  canonicalId: string;
  entityType: EntityType;
  confidence: number;
  method: "EXACT" | "FUZZY" | "MANUAL";
}

export interface IdentityQuarantined {
  type: "IdentityQuarantined";
  externalId: string;
  entityType: EntityType;
  candidateIds: string[];
  topScore: number;
  reason: string;
}

export interface EntityUpdatedEvent {
  type: "EntityUpdatedEvent";
  entityType: EntityType;
  entityId: string;
  changedFields: string[];
  sourceId: string;
  fieldPolicy: Record<string, AuthorityLevel>;
  updatedAt: string;
}

export interface MatchResultLockedEvent {
  type: "MatchResultLockedEvent";
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  groupId?: string;
  lockedAt: string;
  sourceId: string;
}

export interface CorrectionEventMsg {
  type: "CorrectionEvent";
  entityType: EntityType;
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  analystId: string;
  reason?: string;
}

// ─────────────────────────────────────────────
// BC2 — Qualification Engine Events
// ─────────────────────────────────────────────

export interface QualificationSnapshotCreated {
  type: "QualificationSnapshotCreated";
  snapshotId: string;
  groupId: string;
  engineVersion: string;
  inputHash: string;
  createdAt: string;
}

export interface QualificationChangedEvent {
  type: "QualificationChangedEvent";
  teamId: string;
  groupId: string;
  previousTier: string | null;
  newTier: string;
  previousCertainty: string | null;
  newCertainty: string;
  decidingMatchId?: string;
  changedAt: string;
}

export interface TeamAdvanced {
  type: "TeamAdvanced";
  teamId: string;
  groupId: string;
  position: number;
  confirmedAt: string;
}

export interface TeamEliminated {
  type: "TeamEliminated";
  teamId: string;
  eliminationMatchId: string;
  knockoutBy: string;
}

// ─────────────────────────────────────────────
// BC3 — Prediction Engine Events
// ─────────────────────────────────────────────

export interface PredictionUpdatedEvent {
  type: "PredictionUpdatedEvent";
  matchId?: string;
  teamId?: string;
  previousP: number;
  newP: number;
  delta: number;
  modelVersion: string;
  topFactors: FactorContribution[];
  updatedAt: string;
}

export interface ScenarioCreated {
  type: "ScenarioCreated";
  scenarioId: string;
  analystId: string;
  baseSnapshotId: string;
  overrides: ScenarioOverride[];
  createdAt: string;
}

export interface ScenarioSimulated {
  type: "ScenarioSimulated";
  scenarioId: string;
  seed: number;
  iterationsRun: number;
  advancementProbabilities: Record<string, number>;
  factorContributions: Record<string, FactorContribution[]>;
  completedAt: string;
}

export interface ModelCalibrationUpdated {
  type: "ModelCalibrationUpdated";
  calibrationId: string;
  marketCoverage: number;
  rmseImprovement: number;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Shared value types
// ─────────────────────────────────────────────

export type EntityType =
  | "team"
  | "player"
  | "match"
  | "competition"
  | "group"
  | "venue"
  | "city"
  | "country"
  | "weatherLocation"
  | "provider";

export interface FactorContribution {
  factor: string;
  contribution: number; // [-1, 1] Shapley-style attribution
  direction: "positive" | "negative" | "neutral";
}

export interface ScenarioOverride {
  matchId: string;
  homeScore: number;
  awayScore: number;
  note?: string;
}

export type BusEvent =
  | RawProviderEventMsg
  | ProviderSchemaViolation
  | IdentityResolved
  | IdentityQuarantined
  | EntityUpdatedEvent
  | MatchResultLockedEvent
  | CorrectionEventMsg
  | QualificationSnapshotCreated
  | QualificationChangedEvent
  | TeamAdvanced
  | TeamEliminated
  | PredictionUpdatedEvent
  | ScenarioCreated
  | ScenarioSimulated
  | ModelCalibrationUpdated;

export const STREAM_KEYS = {
  intake: "wc2026:stream:intake",
  qualification: "wc2026:stream:qualification",
  prediction: "wc2026:stream:prediction",
  push: "wc2026:stream:push",
} as const;

export const QUEUE_NAMES = {
  intakeEspn: "intake:espn",
  intakeWcLive: "intake:wc-live",
  intakeSofascore: "intake:sofascore",
  intakeZafronix: "intake:zafronix",
  intakeClubElo: "intake:clubelo",
  qualification: "qualification",
  prediction: "prediction",
  reconciliation: "reconciliation",
} as const;
