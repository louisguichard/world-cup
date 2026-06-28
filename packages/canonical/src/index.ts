/**
 * @wc2026/canonical — shared domain types for all bounded contexts.
 * No runtime dependencies. Single source of truth for entity shapes.
 */

export type AuthorityLevel =
  | "PRIMARY"
  | "BACKUP"
  | "COMPUTED"
  | "ANALYST_OVERRIDE";

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

export type ResolutionMethod = "EXACT" | "FUZZY" | "MANUAL";

export interface SourceTrace {
  field: string;
  providerId: string;
  externalId: string;
  value: unknown;
  authority: AuthorityLevel;
  assertedAt: string;
}

export interface CanonicalEntity {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  sourceTrace: SourceTrace[];
}

export interface IdentityAlias {
  id: string;
  canonicalId: string;
  entityType: EntityType;
  providerId: string;
  externalId: string;
  externalDisplayName?: string;
  confidence: number;
  method: ResolutionMethod;
  verifiedAt?: string;
  verifiedBy?: string;
  quarantined: boolean;
  quarantineReason?: string;
}

export interface QuarantineEntry {
  id: string;
  externalId: string;
  entityType: EntityType;
  providerId: string;
  rawPayload: unknown;
  candidateIds: string[];
  topScore: number;
  reason: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: "APPROVED" | "REJECTED" | "NEW_ENTITY";
  createdAt: string;
}

export interface IdentityAuditEntry {
  id: string;
  canonicalId: string;
  entityType: EntityType;
  action: string;
  providerId?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
  performedBy: string;
  createdAt: string;
}

export type QualificationTier =
  | "CHAMPION"
  | "RUNNER_UP"
  | "THIRD"
  | "ELIMINATED"
  | "QUALIFIED_TOP2"
  | "BEST_THIRD"
  | "UNKNOWN";

/** BC2 engine output — deterministic qualification state (not UI labels). */
export type QualificationEngineStatus =
  | "qualified"
  | "at_risk"
  | "projected_out"
  | "eliminated"
  | "pending";

/** UI display tier — mapped from engine status via qualificationView only. */
export type QualificationDisplayTier =
  | "qualified"
  | "alive"
  | "projected_out"
  | "eliminated";

export type QualificationEngineCertainty =
  | "confirmed"
  | "projected_strong"
  | "projected_weak"
  | "projected";

export type QualificationEngineLifeState = "alive" | "projected" | "eliminated";

export interface QualificationEngineStatusRecord {
  status: QualificationEngineStatus;
  certainty: QualificationEngineCertainty;
  lifeState: QualificationEngineLifeState;
  canQualify: boolean;
  projectionScore: number;
  reason?: string;
}

export type QualificationCertainty =
  | "CONFIRMED"
  | "LIKELY"
  | "POSSIBLE"
  | "UNCERTAIN";

export type LifeState = "ALIVE" | "ELIMINATED";

export interface QualificationSnapshot {
  snapshotId: string;
  groupId: string;
  teamId: string;
  tier: QualificationTier;
  certainty: QualificationCertainty;
  lifeState: LifeState;
  projectionScore?: number;
  reasons: string[];
  engineVersion: string;
  inputHash: string;
  createdAt: string;
}

export interface FactorContribution {
  factor: string;
  contribution: number;
  direction: "positive" | "negative" | "neutral";
}

export interface PredictionResult {
  matchId: string;
  homeWinP: number;
  drawP: number;
  awayWinP: number;
  modelVersion: string;
  factorContributions: FactorContribution[];
  createdAt: string;
}

export interface ScenarioOverride {
  matchId: string;
  homeScore: number;
  awayScore: number;
  note?: string;
}

export interface ScenarioResult {
  scenarioId: string;
  seed: number;
  iterationsRun: number;
  advancementProbabilities: Record<string, number>;
  factorContributions: Record<string, FactorContribution[]>;
  completedAt: string;
}

export interface ProviderAdapter<T = unknown> {
  providerId: string;
  entityType: EntityType;
  parse(raw: unknown): T;
  toCanonicalFields(parsed: T): Record<string, unknown>;
}

export interface CorrectionEvent {
  id: string;
  entityType: EntityType;
  entityId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  analystId: string;
  reason?: string;
  appliedAt: string;
}
