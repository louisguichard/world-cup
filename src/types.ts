export const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export type GroupLetter = (typeof groupLetters)[number];
export type MatchStatus =
  | "completed"
  | "live"
  | "scheduled"
  | "postponed"
  | "interrupted"
  | "cancelled";
export type SourceKind = "espn" | "sofascore" | "polymarket" | "model" | "manual";
export type Stage = "R32" | "R16" | "QF" | "SF" | "Final";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  group: GroupLetter;
  logo?: string;
  color?: string;
  alternateColor?: string;
  titleProbability?: number;
  rating: number;
  baseRating?: number;
  fifaPoints?: number;
  fifaRank?: number;
  marketAdjustment?: number;
  resultAdjustment?: number;
  titleCalibrationAdjustment?: number;
};

export type OutcomeProbabilities = {
  homeWin: number;
  draw: number;
  awayWin: number;
};

export type Prediction = OutcomeProbabilities & {
  lambdaHome: number;
  lambdaAway: number;
  predictedHomeScore: number;
  predictedAwayScore: number;
  method: "polymarket" | "strength-model";
  marketSlug?: string;
};

export type PolymarketMatchMarket = {
  teamAKey: string;
  teamBKey: string;
  teamAName: string;
  teamBName: string;
  date: string;
  marketSlug?: string;
  probabilities?: OutcomeProbabilities;
  teamAAdvanceProbability?: number;
  kind: "moneyline" | "advance";
};

export type Match = {
  id: string;
  group?: GroupLetter;
  date: string;
  venue?: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  homeConduct: number;
  awayConduct: number;
  locked: boolean;
  source: SourceKind;
  prediction?: Prediction;
  period?: MatchPeriod;
  clockMinute?: number;
  clockExtra?: number;
  clockRunning?: boolean;
  displayClock?: string;
};

export type ScoreOverride = {
  homeScore: number;
  awayScore: number;
};

export type MatchWithScore = Match & {
  homeScore: number;
  awayScore: number;
};

export type TeamRecord = {
  teamId: string;
  group: GroupLetter;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  conduct: number;
  rating: number;
  fifaRank?: number;
};

export type GroupStanding = {
  group: GroupLetter;
  rows: TeamRecord[];
};

export type BracketMatch = {
  id: string;
  stage: Stage;
  label: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSeedLabel?: string;
  awaySeedLabel?: string;
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
  winProbability?: number;
  homeWinProbability?: number;
  probabilityMethod?: "polymarket" | "model";
  marketSlug?: string;
  source: "scheduled" | "simulated";
  manual?: boolean;
  note?: string;
};

export type TournamentProjection = {
  scoredMatches: MatchWithScore[];
  standings: GroupStanding[];
  bestThirds: TeamRecord[];
  qualifiedThirdGroups: GroupLetter[];
  bracket: BracketMatch[];
};

export type DataLoadResult = {
  teams: Team[];
  matches: Match[];
  knockoutMarkets: PolymarketMatchMarket[];
  loadedAt: string;
  sources: {
    espn: boolean;
    polymarketGames: boolean;
    polymarketWinner: boolean;
    fifaRankings: boolean;
  };
  warnings: string[];
};

export type OpponentProbability = {
  opponentId: string;
  probability: number;
  count: number;
};

export type TeamSimulationSummary = {
  teamId: string;
  iterations: number;
  stageReach: Record<"R32" | "R16" | "QF" | "SF" | "Final" | "Champion", number>;
  opponents: Record<Stage, OpponentProbability[]>;
};

export type TournamentSimulationResult = {
  championOdds: Array<{ teamId: string; probability: number }>;
  teamSummaries: Record<string, TeamSimulationSummary>;
};

// --- Extended types (Road to WC Final) ---

export type TabId = "live" | "results" | "bracket" | "groups" | "simulator" | "teams";
export type GroupsViewMode = "flags" | "table";
export type SimulatorMode = "tournament" | "probabilities" | "methodology";
export type SplashPhase = "loading" | "slow" | "error" | "done";
export type BracketViewMode = "projected" | "confirmed";

export type MatchPeriod =
  | "not_started"
  | "first_half"
  | "half_time"
  | "second_half"
  | "extra_time_first"
  | "extra_time_break"
  | "extra_time_second"
  | "penalties"
  | "full_time"
  | "postponed"
  | "interrupted";

export type QualificationTier =
  | "qualified"
  | "at_risk"
  | "projected_out"
  | "eliminated"
  | "pending";

export type QualificationCertainty = "confirmed" | "projected";

export type QualificationStatus = {
  status: QualificationTier;
  /** Whether the outcome is mathematically locked or based on the current table. */
  certainty: QualificationCertainty;
  eliminationProbability?: number;
  pointsNeeded?: number;
  /** Short explanation for UI tooltips and section copy. */
  reason?: string;
};

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "yellow_card"
  | "red_card"
  | "yellow_red_card"
  | "substitution"
  | "var_review"
  | "goal_disallowed"
  | "penalty_missed"
  | "penalty_saved";

export type MatchEvent = {
  providerId: string;
  espnEventId?: string;
  minute: number;
  minuteExtra?: number;
  type: MatchEventType;
  teamId: string;
  playerName: string;
  assistName?: string;
  isVarReviewed?: boolean;
  varOutcome?: "confirmed" | "overturned";
};

export type MergedMatch = {
  id: string;
  matchId?: string;
  group?: GroupLetter;
  stage?: Stage;
  date: string;
  venue?: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  homeConduct: number;
  awayConduct: number;
  locked: boolean;
  source: SourceKind;
  dataSource?: SourceKind;
  sofaEventId?: string;
  espnEventId?: string;
  compositeKey?: string;
  sofaLinkedAt?: number;
  period?: MatchPeriod;
  clockMinute?: number;
  clockExtra?: number;
  clockRunning?: boolean;
  displayClock?: string;
  lastUpdatedAt?: number;
  prediction?: Prediction;
};

export type BroadcastChip = {
  matchId: string;
  kickoffUTC: string;
  englishNetwork: string;
  spanishNetwork: string;
  streaming: string[];
  isConcurrent: boolean;
  venue: { name: string; city: string; country: string };
};

export type MatchScheduleEntry = {
  matchNumber: number;
  stage: string;
  group?: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: { utc: string };
  venue: {
    name: string;
    city: string;
    country: string;
    ianaTimezone?: string;
  };
  broadcast: {
    USA: {
      english: { network: string; streaming?: string };
      spanish: { network: string; streaming?: string };
      concurrentMatchNote?: string | null;
    };
  };
};

export type KnockoutScore = {
  home90: number;
  away90: number;
  homePens?: number;
  awayPens?: number;
};

export const GROUP_STAGE_MATCH_COUNT = 72;
export const STORAGE_KEY = "world-cup-2026-score-overrides";
export const PICKS_KEY = "world-cup-2026-bracket-picks";
export const DATA_CACHE_KEY = "world-cup-2026-data-cache-v3";
