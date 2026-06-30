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
export type Stage = "R32" | "R16" | "QF" | "SF" | "ThirdPlace" | "Final";

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
  /** World Cup 2026 Teams API id (for roster / player photos). */
  wc2026TeamId?: string;
  /** Spanish display name (canonical catalog). */
  nameEs?: string;
};

export type MatchSupplement = {
  highlightsUrl?: string;
  source: "andrekamp";
  fetchedAt: number;
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
  penaltyShootout?: PenaltyShootout;
  decidedByPenalties?: boolean;
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

export type BracketSlotCertainty = "confirmed" | "projected" | "tbd";

export type BracketGhostCandidate = {
  teamId: string;
  /** Rough probability (0–1) this team could reach this slot. */
  frequency: number;
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
  /** Whether the home slot is confirmed, projected, or unknown. */
  homeCertainty?: BracketSlotCertainty;
  /** Whether the away slot is confirmed, projected, or unknown. */
  awayCertainty?: BracketSlotCertainty;
  /** Ghost candidates for the home slot, sorted by frequency DESC, max 2. */
  homeGhosts?: BracketGhostCandidate[];
  /** Ghost candidates for the away slot, sorted by frequency DESC, max 2. */
  awayGhosts?: BracketGhostCandidate[];
  /** Penalty shootout when the bracket slot is stamped from a completed match. */
  penaltyShootout?: PenaltyShootout;
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

export type TabId = "live" | "results" | "bracket" | "groups" | "simulator" | "teams" | "schedule" | "tournament";

// --- Match detail + tournament navigation ---

export type MatchDetailTab =
  | "summary"
  | "watch"
  | "statistics"
  | "lineups"
  | "commentary"
  | "h2h"
  | "highlights";
export type TournamentSubTab = "matches" | "standings" | "bracket" | "stats" | "history";

export type NavigationContext = {
  from: "tournament" | "live" | "schedule" | "results" | "bracket" | "groups" | "venue";
  tournamentSubTab?: TournamentSubTab;
  scrollY?: number;
  dateKey?: string;
  bracketRound?: string;
  venueSlug?: string;
};

// --- Player types (minimal v1) ---

export type PlayerRef = {
  id: string;
  displayName: string;
  jerseyNumber?: number;
  headshotUrl?: string;
  position?: string;
  role?: "player" | "manager";
};

/** Enriched profile for a goal scorer in a match. */
export type GoalScorerProfile = {
  eventId: string;
  playerId?: string;
  displayName: string;
  minute: number;
  minuteExtra?: number;
  teamId: string;
  isOwnGoal: boolean;
  photoUrl?: string;
  age?: number;
  hometown?: string;
  nationality?: string;
  currentClub?: string;
  position?: string;
  jerseyNumber?: string;
  tournamentGoals?: number;
  internationalGoals?: number;
  internationalAppearances?: number;
};

export type LineupPlayer = {
  player: PlayerRef;
  gridPosition?: { x: number; y: number };
  rating?: number;
  isCaptain?: boolean;
};

export type Lineup = {
  team: "home" | "away";
  formation: string;
  manager?: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

// --- Match statistics (period-aware) ---

export type TeamStats = {
  ballPossession?: number;
  expectedGoals?: number;
  totalShots?: number;
  shotsOnTarget?: number;
  shotsOffTarget?: number;
  blockedShots?: number;
  bigChances?: number;
  bigChancesMissed?: number;
  corners?: number;
  freeKicks?: number;
  offsides?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
  passAccuracy?: number;
  totalPasses?: number;
  tackles?: number;
  interceptions?: number;
  saves?: number;
  goalKicks?: number;
  throwIns?: number;
  hitWoodwork?: number;
};

export type MatchStatisticsBundle = {
  matchId: string;
  period: "all" | "first_half" | "second_half";
  home: TeamStats;
  away: TeamStats;
};

// --- Momentum (v1 derived) ---

export type MomentumInterval = {
  startMinute: number;
  endMinute: number;
  homeValue: number;
  awayValue: number;
};

// --- H2H ---

export type HistoricalMatch = {
  id: string;
  date: string;
  tournament: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
};

export type H2HBundle = {
  team1Id: string;
  team2Id: string;
  summary: {
    total: number;
    team1Wins: number;
    team2Wins: number;
    draws: number;
  };
  matches: HistoricalMatch[];
};

// --- Tournament stats ---

export type TournamentPlayerStat = {
  player: PlayerRef;
  teamId: string;
  value: number;
};
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

export type QualificationCertainty =
  | "confirmed"
  | "projected_strong"
  | "projected_weak"
  | "projected";

export type LifeState = "alive" | "projected" | "eliminated";

export type QualificationStatus = {
  status: QualificationTier;
  /** Whether the outcome is mathematically locked or based on the current table. */
  certainty: QualificationCertainty;
  /** Simplified UI bucket: alive (fighting), projected (on track), eliminated (out). */
  lifeState: LifeState;
  /** False when no knockout path remains. */
  canQualify: boolean;
  /**
   * Rule-based confidence score 0–100 (not a true probability).
   * 0 = mathematically eliminated.
   */
  projectionScore: number;
  pointsNeeded?: number;
  /** Short explanation for UI tooltips and section copy. */
  reason?: string;
  eliminationReason?: string;
  /** @deprecated Use projectionScore — kept for transitional callers. */
  eliminationProbability?: number;
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
  /** Provider player id when incidents/lineups include it. */
  playerId?: string;
  assistName?: string;
  isVarReviewed?: boolean;
  varOutcome?: "confirmed" | "overturned";
};

export type PenaltyKick = {
  scored: boolean;
  playerName?: string;
};

export type PenaltyShootout = {
  home: PenaltyKick[];
  away: PenaltyKick[];
  homeScore: number;
  awayScore: number;
};

export type MergedMatch = {
  id: string;
  matchId?: string;
  group?: GroupLetter;
  stage?: Stage;
  date: string;
  /** Unix epoch ms of scheduled kickoff — used by smart polling lifecycle */
  kickoffMs?: number;
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
  /** FIFA public API match id (api.fifa.com). */
  fifaMatchId?: string;
  compositeKey?: string;
  sofaLinkedAt?: number;
  period?: MatchPeriod;
  clockMinute?: number;
  clockExtra?: number;
  clockRunning?: boolean;
  displayClock?: string;
  lastUpdatedAt?: number;
  prediction?: Prediction;
  penaltyShootout?: PenaltyShootout;
  /** Set when the match was decided by a knockout penalty shootout. */
  decidedByPenalties?: boolean;
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
    state?: string | null;
    fifaOfficialName?: string;
    capacity?: number;
    ianaTimezone?: string;
  };
  broadcast: {
    USA: {
      english: { network: string; streaming?: string };
      spanish: { network: string; streaming?: string };
      concurrentMatchNote?: string | null;
    };
  };
  espnEventId?: string;
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

// --- API orchestration types ---

export type SourceId =
  | "wclive"
  | "espn"
  | "sportapi7"
  | "footapi7"
  | "zafronix"
  | "sofascore"
  | "freeapi"
  | "wc2026teams"
  | "static";

export type CommentaryEntry = {
  minute: number;
  text: string;
  type?: "goal" | "card" | "sub" | "var" | "general";
};

export type PlayerEntry = {
  id?: string;
  name: string;
  number?: number;
  position?: string;
};

export type MatchLineups = {
  home: { startingXI: PlayerEntry[]; subs: PlayerEntry[] };
  away: { startingXI: PlayerEntry[]; subs: PlayerEntry[] };
};

export type MatchStats = {
  possession?: { home: number; away: number };
  shots?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  corners?: { home: number; away: number };
  fouls?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };
};

export type WeatherIconKind =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "rain"
  | "showers"
  | "thunderstorm"
  | "snow"
  | "fog"
  | "wind"
  | "unknown";

export type WeatherSnapshot = {
  city: string;
  tempC: number;
  tempF: number;
  condition: string;
  iconKind: WeatherIconKind;
  icon: string;
  humidity?: number;
  windKph?: number;
  fetchedAt: number;
  source?: "yahoo" | "openweather";
};

export type OddsSnapshot = {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  fetchedAt: number;
  /** Where these prices came from — shown in the UI. */
  source?: "polymarket" | "sportsbook";
  marketSlug?: string;
  /** Knockout advance market — no draw price. */
  twoWay?: boolean;
};

export type FuturesOdds = {
  teams: { teamId: string; name: string; odds: number }[];
  fetchedAt: number;
};

export type TeamFormEntry = {
  matchId?: string;
  opponent: string;
  result: "W" | "D" | "L";
  goalsFor: number;
  goalsAgainst: number;
  date: string;
  competition?: string;
};

export type StadiumInfo = {
  id?: string;
  name: string;
  city: string;
  country: string;
  capacity?: number;
  lat?: number;
  lon?: number;
  heroImageUrl?: string;
  cityHeroImageUrl?: string;
  heroImageCredit?: string;
};
