export const groupLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export type GroupLetter = (typeof groupLetters)[number];
export type MatchStatus = "completed" | "live" | "scheduled";
export type SourceKind = "espn" | "polymarket" | "model" | "manual";
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
  group: GroupLetter;
  date: string;
  venue?: string;
  city?: string;
  country?: string;
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

export type ConfirmedFixture = {
  id: string;
  date: string;
  round: string;
  city?: string;
  country?: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  prediction?: Prediction;
};

export type DataLoadResult = {
  teams: Team[];
  matches: Match[];
  knockoutMarkets: PolymarketMatchMarket[];
  knockoutFixtures: ConfirmedFixture[];
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
