export type QualificationTier =
  | "CHAMPION"
  | "RUNNER_UP"
  | "THIRD"
  | "ELIMINATED"
  | "QUALIFIED_TOP2"
  | "BEST_THIRD"
  | "UNKNOWN";

export type QualificationCertainty =
  | "CONFIRMED"
  | "LIKELY"
  | "POSSIBLE"
  | "UNCERTAIN";

export type LifeState = "ALIVE" | "ELIMINATED";

export interface TeamStanding {
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

export interface GroupQualification {
  teamId: string;
  groupId: string;
  tier: QualificationTier;
  certainty: QualificationCertainty;
  lifeState: LifeState;
  projectionScore?: number;
  reasons: string[];
}
