/**
 * Plain-language labels and short help text for the whole app.
 * Written for easy reading (about 6th-grade level).
 */

export const APP_COPY = {
  /** Bottom navigation tab names */
  tabs: {
    live: "Live",
    tournament: "Tournament",
    schedule: "Schedule",
    results: "Results",
    groups: "Groups",
    bracket: "Bracket",
    teams: "Teams",
    simulator: "Simulator",
  },

  /** Words we use a lot — same meaning everywhere */
  glossary: {
    lockedIn:
      "Locked in means the math is done — no more games can change this.",
    probably:
      "Probably means it looks this way now, but more games could still change it.",
    points: "Points — teams earn 3 for a win and 1 for a tie.",
    goalDiff: "Goal difference — goals scored minus goals allowed.",
    goalsFor: "Goals scored in all group games.",
    group: "Group — teams play others in the same letter group first.",
    cutoff: "Cutoff — only the top 8 third-place teams move on.",
  },

  /** Who moves on to the next round */
  qual: {
    sectionTitle: "Who moves on",
    sectionLead:
      "Locked in = definitely moving on. Probably = looks good now, but more games could change it.",
    confirmedQualified: "Locked in · Moving on",
    confirmedQualifiedShort: "In ✓",
    confirmedQualifiedHint:
      "This team is definitely moving on. All group games are done and the spot is final.",
    projectedQualified: "Probably · Moving on",
    projectedQualifiedShort: "Likely in",
    projectedQualifiedHint:
      "This team looks like it will move on, but more group games could still change that.",
    confirmedEliminated: "Locked in · Out",
    confirmedEliminatedShort: "Out ✕",
    confirmedEliminatedHint:
      "This team cannot move on anymore — even the best results left would not be enough.",
    projectedEliminated: "Probably · Out",
    projectedEliminatedShort: "Likely out",
    projectedEliminatedHint:
      "This team will probably not move on, but it is not 100% final yet.",
    inContention: "Still fighting",
    inContentionShort: "Still in it",
    inContentionHint: "This team still has a real chance — it depends on upcoming games.",
    qualifiedTitle: "Moving on",
    qualifiedLead:
      "Top two in each group move on. Locked in when all group games are finished; probably while games are still left.",
    confirmedQualifiedSection: "Locked in · Moving on",
    projectedQualifiedSection: "Probably · Moving on",
    eliminatedTitle: "Out of the tournament",
    eliminatedLead: "Teams with no remaining path to the round of 32.",
    confirmedEliminatedSection: "Locked in · Out",
    projectedEliminatedSection: "Probably · Out",
    contentionTitle: "Still in the race",
    contentionLead: "Third-place teams still fighting for a spot in the round of 32.",
    contentionAliveSection: "Still fighting",
    contentionAliveHint: "Still has a real path — outcome depends on remaining group games.",
    contentionProjectedOutSection: "Probably · Out",
    contentionProjectedOutHint:
      "Unlikely to advance, but not mathematically eliminated yet — must win out and need help.",
    noQualified: "No teams in the top two yet.",
    noEliminated: "No teams are fully out yet.",
    noContention: "No teams on the bubble right now.",
  },

  /** Third-place race (best 8 of 12 third-place teams) */
  bestThird: {
    title: "Third-place race",
    subtitle: "The best 8 third-place teams also move on to the round of 32.",
    liveBadge: "Live",
    safe: "Safe",
    bubble: "On the bubble",
    outside: "Unlikely",
    safeHint: "Inside the top 8 third-place spots right now.",
    bubbleHint: "Close to the cutoff — one goal could change things.",
    outsideHint: "Far from the top 8 cutoff right now.",
    cutoffBannerIn: (name: string) => `${name} moved into the top 8!`,
    cutoffBannerOut: (name: string) => `${name} dropped out of the top 8.`,
    expandTable: "Show full list",
    collapseTable: "Show short list",
    cutoffLabel: "— Top 8 move on —",
    raceTitle: "Race for third place",
    raceLead: "Top 8 third-place teams advance.",
  },

  /** Table column headers — spell things out */
  table: {
    rank: "#",
    team: "Team",
    points: "Points",
    goalDiff: "Goal diff",
    goalsFor: "Goals scored",
    goalsAgainst: "Goals allowed",
    group: "Group",
    change: "Move",
    status: "Status",
    gamesPlayed: "Games",
    wins: "Wins",
    ties: "Ties",
    losses: "Losses",
    time: "Time",
    home: "Home",
    score: "Score",
    away: "Away",
    venue: "Stadium",
    gameStatus: "Status",
  },

  live: {
    eyebrow: "USA · Canada · Mexico",
    titleAccent: "Final.",
    heroLead:
      "Watch live games, see who might move on, and check upcoming matches — all in your local time.",
    liveNowKicker: "Live right now",
    liveNowTitle: "Games happening now",
    noLiveKicker: "No live games",
    noLiveBody:
      "Nothing is live right now. Check Results for finished games or Schedule for what's coming up.",
    scheduleKicker: "Coming up",
    scheduleTitle: "Upcoming games",
    noUpcoming: "No upcoming games — check Results for finished matches.",
    showAllDays: (n: number) => `Show all ${n} days`,
    showLess: "Show fewer days",
    qualKicker: "Moving on",
    qualTitle: "Who is through?",
    promoteMatch: "Show this game as the main live match",
    recentResultsKicker: "Finished games",
    recentResultsTitle: "Recent scores",
    seeAllResults: "See all results",
    finalWhistle: "Final",
    bracketAriaLabel: "Knockout bracket",
    bracketKicker: "Knockout path",
    bracketTitle: "Road to the final",
    bracketLead:
      "Preview the full bracket here. Switch between best-guess projections and locked-in teams.",
    groupStandings: {
      title: (group: string) => `Group ${group} · live table`,
      ariaLabel: (group: string) => `Live Group ${group} standings`,
      liveBadge: "Live",
      updatesLive: "Points and goal difference update as goals are scored.",
      sameGroupMulti: (count: number) =>
        `${count} games live in this group — the table shifts after every goal.`,
    },
  },

  schedule: {
    heroLead:
      "Every World Cup game from the group stage through the final — times shown in your time zone.",
    viewOneDay: "One day",
    viewAllDays: "All days",
    today: "Today",
    prevDay: "Previous day",
    nextDay: "Next day",
    filterStatus: "Show",
    filterAll: "All games",
    filterUpcoming: "Not started yet",
    filterLive: "Live now",
    filterCompleted: "Finished",
    sortBy: "Sort by",
    sortTime: "Start time",
    sortGroup: "Group",
    sortStage: "Round",
    emptyAll: "No games on the schedule yet.",
    emptyFilter: "No games match this filter.",
    matchCount: (n: number) => `${n} ${n === 1 ? "game" : "games"}`,
  },

  groups: {
    eyebrow: "Group stage",
    titleAccent: "Forty-eight teams.",
    heroLead:
      "Each group has 4 teams. The top 2 in each group move on. Colors show who is in, who is out, and who is still fighting.",
    legendConfirmedIn: "Locked in · Moving on",
    legendProbablyIn: "Probably · Moving on",
    legendConfirmedOut: "Locked in · Out",
    legendProbablyOut: "Probably · Out",
    viewFlags: "Team flags",
    viewTable: "Score table",
    standingsKicker: "Standings",
    resultsKicker: "Finished games",
    fixturesKicker: "Upcoming games",
    noResults: "No finished group games match this filter.",
    qualKicker: "Moving on",
  },

  results: {
    eyebrow: "Finished games",
    titleAccent: "final scores.",
    heroLead:
      "Every completed game, grouped by day. Tap a game to learn more about the teams.",
    sortLabel: "Sort",
    sortRecent: "Newest first",
    sortOldest: "Oldest first",
    sortHighScore: "Most goals",
    sortBigWin: "Biggest win",
    stageLabel: "Round",
    stageAll: "All rounds",
    stageGroup: "Group stage",
    stageR32: "Round of 32",
    stageR16: "Round of 16",
    stageQF: "Quarterfinals",
    stageSF: "Semifinals",
    stageFinal: "Final",
    groupLabel: "Group",
    groupAll: "All groups",
    searchLabel: "Find a team",
    searchPlaceholder: "Type a country name…",
    empty: "No finished games match this filter.",
    today: "Today",
    yesterday: "Yesterday",
    day: "Day",
  },

  bracket: {
    eyebrow: "Playoff rounds",
    titleAccent: "the Final.",
    heroLead:
      "See the path from the round of 32 to the championship. Switch between guesses and locked-in teams.",
    modeLabel: "Bracket view",
    projectedLabel: "Best guess",
    projectedSubtitle:
      "Uses today's standings. Teams can still change as more group games are played.",
    confirmedLabel: "Locked in",
    confirmedSubtitle:
      "Only shows teams that are definitely in after all 3 group games are done. Empty slots say TBD.",
  },

  teams: {
    eyebrow: "All 48 teams",
    titleAccent: "Every nation.",
    heroLead: "Browse every country, filter by status, and tap a team for details.",
    searchPlaceholder: "Search teams…",
    filterAll: "All teams",
    filterQualified: "Locked in · Moving on",
    filterProjected: "Probably · Moving on",
    filterAtRisk: "Still fighting",
    filterEliminated: "Out",
    filterContention: "Still in the race",
    filterStillPlaying: "Still playing",
    rankLabel: (rank: number | string, points: number, gd: number) =>
      `Place ${rank} · ${points} points · ${gd >= 0 ? "+" : ""}${gd} goal diff`,
  },

  topBar: {
    liveCount: (n: number) => `${n} live now`,
    updated: (time: string) => `Updated ${time}`,
  },

  /** Game clock and status labels */
  match: {
    final: "Final",
    live: "Live",
    halftime: "Halftime",
    kickoff: "Kickoff",
    penalties: "Penalties",
    postponed: "Postponed",
    interrupted: "Stopped",
    extraTimeBreak: "Extra time break",
    firstHalf: "First half",
    secondHalf: "Second half",
    extraTimeFirst: "Extra time · 1st half",
    extraTimeSecond: "Extra time · 2nd half",
    fullTime: "Game over",
  },

  bestThirdTable: {
    title: "Third-place ranking",
    lead:
      "All 12 third-place teams ranked. The top 8 move on. Locked in = final; probably = could still change.",
    h2h: "Vs other 3rd-place teams",
    discipline: "Fair play",
    legend:
      "Fair play score: yellow card −1, red card −4. Lower is better. Head-to-head vs other third-place teams is shown for info only.",
  },

  bestThirdTimeline: {
    title: "Third-place race · replay",
    subtitle: "See how the ranking changed goal by goal",
    liveBadge: "Live",
    speed: "Speed",
    stepBack: "Go back",
    play: "Play",
    pause: "Pause",
    stepForward: "Go forward",
    jumpToNow: "Jump to now",
    currentStandings: "Right now — drag the slider to replay how we got here",
    scored: (name: string, score: string, minute: number) =>
      `${name} scored! ${score} at ${minute} minutes`,
    movedRank: (from: number, to: number) => `Moved from #${from} to #${to}`,
    matchStart: (home: string, away: string, group: string) =>
      `${home} vs ${away} — Group ${group} is starting`,
    fullTime: (home: string, score: string, away: string, changed: number) =>
      `Game over: ${home} ${score} ${away} — ${changed} teams moved in the ranking`,
  },

  bestThirdRace: {
    liveCallout: "Live now",
    watchCallout: "Worth watching",
    statusCutLine: "On the cutoff line",
    statusMovingOn: "Probably moving on",
    statusOut: "Out",
    statusLikelyOut: "Probably out",
    statusStillIn: "Still fighting",
  },

  bracketBento: {
    kicker: "Knockout rounds",
    confirmedTitle: "Locked in",
    projectedTitle: "Best guess",
    confirmedHint:
      "Only teams that are definitely in after all 3 group games. Empty spots say TBD (to be decided).",
    projectedHint:
      "Based on today's standings. Teams can still change as more group games are played.",
    loading: "The bracket will show up once tournament data is loaded.",
  },

  odds: {
    tabLabel: "Odds & picks",
    panelTitle: "Who might win?",
    panelTitleCompact: "Win odds",
    drawLabel: "Tie game",
    toAdvanceLabel: "Not used (knockout)",
    favoriteBadge: "Favorite",
    underdogBadge: "Underdog",
    impliedChance: (pct: number) => `About ${pct}% chance`,
    favoriteLead: (team: string, pct: number) =>
      `${team} is the favorite — traders give them about a ${pct}% chance to win this game.`,
    drawFavoriteLead: (pct: number) =>
      `A tie is the favorite — traders give a draw about a ${pct}% chance.`,
    sourcePolymarket:
      "Prices come from Polymarket, where many people trade real money on who they think will win.",
    sourceSportsbook:
      "Prices come from a sportsbook — a place that takes bets on games.",
    sourceGeneric: "Prices come from a betting market.",
    whatNumbersMeanTitle: "What do the numbers mean?",
    americanOddsExplain:
      "Negative numbers (like -150) mean the favorite: you risk more to win $100. Positive numbers (like +200) mean the underdog: you risk $100 to win more.",
    favoriteExplain:
      "The favorite is the team (or a tie) that traders think is most likely to happen. It has the best chance on the board, not a guarantee.",
    disclaimer:
      "For fun and information only — not betting advice. Odds can change and may differ where you live.",
    titleMarketTitle: "Win the whole World Cup?",
    titleMarketExplain:
      "This is the chance traders give this team to lift the trophy — not just win one game.",
    matchPicksTitle: "Tips for this team's games",
    matchPicksExplain:
      "These picks come from a football tips site. They guess who wins each match — home team, away team, or a tie.",
    noMatchPicks: "No tips listed for this team's upcoming games yet.",
    noTitleOdds: "No win-the-tournament price for this team yet.",
    pickForHome: (team: string, opponent: string) => `${team} to beat ${opponent}`,
    pickForAway: (team: string, opponent: string) => `${team} to beat ${opponent}`,
    pickForDraw: (home: string, away: string) => `Tie between ${home} and ${away}`,
    pickExplainHome: (team: string, opponent: string) =>
      `The tip says ${team} is more likely to beat ${opponent} at home.`,
    pickExplainAway: (team: string, opponent: string) =>
      `The tip says ${team} is more likely to beat ${opponent} on the road.`,
    pickExplainDraw: (home: string, away: string) =>
      `The tip says ${home} and ${away} are about even — a tie is likely.`,
    insightsTitle: "Match tips & track record",
    insightsExplain:
      "Football tips for upcoming games, plus how well this tipster did lately.",
    insightsWinRate: "Wins lately",
    insightsProfit: "Money won/lost (if you followed every tip)",
    insightsPickColumn: "Their pick",
    insightsResultColumn: "What happened",
    insightsPending: "Not played yet",
    insightsHomeWin: "Home team wins",
    insightsAwayWin: "Away team wins",
    insightsDraw: "Tie",
    simulatorNote:
      "Want to play with scores yourself? Open the Simulator tab to change results and see who might advance.",
    fixtureBettingTitle: "Betting & tips",
    fixtureBettingLoading: "Loading prices…",
    fixtureBettingExpand: "Tap to see odds, tips, and what the numbers mean",
    fixtureSummaryFavorite: (team: string, pct: number) => `Favorite: ${team} (${pct}%)`,
    fixtureSummaryTip: (pick: string) => `Tip: ${pick}`,
  },

  teamDrawer: {
    openTeamProfile: "Open team profile",
    teamClickHint: "View team details, matches, and qualification status",
    tabOverview: "Overview",
    tabMatches: "Matches",
    tabPlayers: "Players",
    tabForm: "Form",
    tabContext: "Context",
    tabHistorical: "History",
    historicalLead: "Notable World Cup history for this team.",
    highlightsTeaser: "Watch highlights",
    fixturesEmptyEliminated: "Their World Cup run is over. Past results are below.",
    fixturesEmptyNoData: "No match data yet for this team.",
    eliminatedChipHint: "Tap to read why they're out",
    thirdRankBubble: (rank: number) => `#${rank} among third-place teams — on the bubble`,
    thirdRankCutoff: "#8 among third-place teams — on the edge",
    thirdRankOutside: (rank: number) => `#${rank} among third-place teams — outside top 8`,
  },

  cutoffPopover: {
    title: "On the edge of qualification.",
    rankLine: (rank: number) => `You are currently #${rank} among third-place teams.`,
    safeNotLocked: "Safe for now, but not locked.",
    holdLine:
      "Keep your place by holding your current points and goal difference.",
    dropLine:
      "You can drop out if a team below you wins, improves goal difference, or scores enough to pass you on the tiebreakers.",
    watchLine:
      "Watch the teams just behind the cutoff — they are the ones most likely to push you out.",
    statsHeading: "Current stats",
    keepHeading: "What keeps you in",
    knockHeading: "What can knock you out",
    watchHeading: "Teams to watch",
    infoLabel: "Qualification scenario details",
    openTeam: "Open team profile",
  },

  knockoutStory: {
    cardTitle: "Elimination story",
    viewDecidingMatch: "See the match that knocked them out",
    viewAllFixtures: "See all their World Cup games",
    timelineHeading: "What changed near the end",
    partialTitle: "Elimination story",
    partialLead: "We can't pinpoint the exact match or goal from current data.",
    partialKnownFacts: "What we know",
    partialFooter: "No remaining result can move them back into qualification.",
    loading: "Loading elimination story…",
    fullIntro: "This team was knocked out when",
    fullReason: "That result sealed their fate because",
    fullAliveSpan: "They stayed mathematically alive for",
    fullFooter: "No remaining result can now move them back into qualification.",
    qualPathTitle: "Qualification path",
  },

  pwa: {
    installTitle: "Install the app",
    installBodyMobile: "Add to your home screen for a full-screen app with live scores.",
    installBodyDesktop: "Install on your computer for quick access from the dock or taskbar.",
    installButton: "Install app",
    installButtonWorking: "Opening installer…",
    installIosTitle: "Add to Home Screen",
    installIosBody: "Tap Install — we'll show the quick steps to add this app to your home screen.",
    dismiss: "Not now",
    refreshing: "Updating scores…",
    guide: {
      close: "Close",
      done: "Got it",
      ios: {
        title: "Add to Home Screen",
        lead: "Safari does not allow one-tap install. These two steps add the app to your home screen.",
        steps: [
          "Tap the Share button at the bottom of Safari (square with an arrow).",
          "Scroll down and tap Add to Home Screen, then tap Add.",
        ],
      },
      android: {
        title: "Install the app",
        lead: "If the installer did not open automatically, use your browser menu:",
        steps: [
          "Tap the menu button (⋮) in Chrome.",
          "Tap Install app or Add to Home screen.",
          "Confirm Install when asked.",
        ],
      },
      desktopChrome: {
        title: "Install on your computer",
        lead: "If the installer did not open, use the install control in your address bar:",
        steps: [
          "Look for the install icon in the address bar (monitor with a down arrow, or a plus).",
          "Click Install or Add to dock.",
          "Confirm — the app will open from your dock, taskbar, or Start menu.",
        ],
      },
      desktopSafari: {
        title: "Add to Dock",
        lead: "Safari on Mac can pin this site as an app in your Dock:",
        steps: [
          "Open the File menu in Safari.",
          "Choose Add to Dock.",
          "Launch Road to the Final from your Dock like any other app.",
        ],
      },
      desktopOther: {
        title: "Install the app",
        lead: "Use your browser's install or shortcut option for this site:",
        steps: [
          "Open the browser menu (often ⋮ or ☰).",
          "Look for Install app, Add to Home screen, or Create shortcut.",
          "Confirm — you can then open the app from your dock, desktop, or home screen.",
        ],
      },
    },
  },

  simulator: {
    loading: "Loading scores and odds…",
    loadError: "The simulator could not load.",
    tryAgain: "Try again",
    heroLead:
      "Change scores, pick winners, and see who might move on — from the group stage all the way to the final.",
    tabTournament: "Play it out",
    tabProbabilities: "Win chances",
    tabMethodology: "How it works",
    resultsIn: (n: number) => `${n} finished games`,
    marketPriced: (n: number) => `${n} with betting odds`,
    projectedWinner: (name: string) => `Most likely winner · ${name}`,
    preparingRuns: "Calculating win chances…",
    preparingRunsDetail: (n: string) =>
      `Trying ${n} different ways the rest of the tournament could play out.`,
    projectedStandings: "Group standings (your guess)",
    tapGroupHint: "Tap a group to see and change its games.",
    monteCarloKicker: "Win chances",
    titleOdds: "Who might win it all?",
    showMarket: "Show betting odds",
    hideMarket: "Hide betting odds",
    model: "Our guess",
    market: "Betting",
  },

  splash: {
    loadingAria: "Loading",
    simulationError: "Simulation could not complete",
    liveDataError: "Could not reach live match data",
    connectionHint: "Check your connection and try again",
    retryAria: "Retry loading match data",
    retryButton: "Try again",
  },

  errors: {
    sectionUnavailable: "This section is not available right now",
    somethingWrong: "Something went wrong",
    sectionFailed: "This section could not load.",
    tryAgain: "Try again",
  },

  certainty: {
    confirmed: "Locked in",
    projected: "Best guess",
    projectedStrong: "Leading",
    projectedWeak: "On track",
    simulated: "Simulated",
    tbd: "TBD",
  },

  goalScorer: {
    age: "Age",
    hometown: "Home town",
    club: "Club",
    tournamentGoals: "Goals this World Cup",
    internationalGoals: "Career goals",
    internationalCaps: "Career caps",
    ownGoalBadge: "OG",
    placeholderNote:
      "Player photo and career stats will show up when roster data is available.",
    goalBy: (name: string) => `Goal by ${name}`,
  },

  dataFreshness: {
    stale: (time: string) => `Scores may be out of date — last update ${time}`,
    proxyDeadPrefix: "Data source unavailable",
  },

  predictions: {
    ariaLabel: "Match tips",
    loading: "Loading today's tips…",
    marketClassic: "Who wins the game?",
    marketOverUnder: "Total goals over or under 2.5",
    marketBothScore: "Both teams score",
    guessColumn: "What they guessed",
    winsLosses: (won: number, lost: number) => `${won} wins · ${lost} losses`,
    featuredPerformance: "Featured tips — how they did",
    allPerformance: "All tips — how they did",
    wcTeamsToday: "World Cup teams playing today",
    tipPrefix: "Tip:",
    confidence: (pct: number) => ` · about ${pct}% sure`,
    noWcTips: (leagueCount: number) =>
      `No World Cup team tips in today's list yet — we track ${leagueCount} leagues. Tips show up here when this team has a game today.`,
    extraFeatured: "Extra featured tips",
    paidPlanNote: "Extra featured tips need a paid plan on this tips website.",
  },

  aria: {
    mainNav: "Main navigation",
    qualifiedTeams: "Teams moving on",
    eliminatedTeams: "Teams out of the tournament",
    contentionTeams: "Teams still in the race",
    knockoutBracket: "Knockout bracket",
    bestThirdRankings: "Best third-place rankings",
    bestThirdTimeline: "Best third ranking positions over time",
    timelinePosition: "Timeline position",
    goalScorers: "Goal scorers",
    goalsAndCards: "Goals and cards",
    matchDetail: "Match detail",
    close: "Close",
    concurrentBroadcast: "Also on another channel",
    standingsViewMode: "Standings view mode",
    qualificationFlags: "Qualification flags",
    groupStandings: "Group standings",
    groupTables: "Group tables",
    recentResults: "Recent results",
    filterResultsByTeam: "Filter results by team",
    upcomingMatches: "Upcoming matches",
    liveNow: "Live now",
    upcomingFixtures: "Upcoming games",
    qualification: "Who moves on",
    scheduleFilters: "Schedule filters",
    viewMode: "View mode",
    dayNavigation: "Day navigation",
    selectMatchDate: "Select match date",
    searchTeams: "Search teams",
    filterByQualification: "Filter by status",
    winDrawLoss: "Win, tie, and loss breakdown",
    colorTheme: "Color theme",
    footballStreams: "Football live streams",
  },
} as const;

/** Qualification display strings — used by qualificationDisplay.ts */
export function qualCopyFromVariant(
  variant: "confirmed-qualified" | "projected-qualified" | "confirmed-eliminated" | "projected-eliminated" | "in-contention"
) {
  const q = APP_COPY.qual;
  switch (variant) {
    case "confirmed-qualified":
      return {
        label: q.confirmedQualified,
        shortLabel: q.confirmedQualifiedShort,
        hint: q.confirmedQualifiedHint,
      };
    case "projected-qualified":
      return {
        label: q.projectedQualified,
        shortLabel: q.projectedQualifiedShort,
        hint: q.projectedQualifiedHint,
      };
    case "confirmed-eliminated":
      return {
        label: q.confirmedEliminated,
        shortLabel: q.confirmedEliminatedShort,
        hint: q.confirmedEliminatedHint,
      };
    case "projected-eliminated":
      return {
        label: q.projectedEliminated,
        shortLabel: q.projectedEliminatedShort,
        hint: q.projectedEliminatedHint,
      };
    case "in-contention":
      return {
        label: q.inContention,
        shortLabel: q.inContentionShort,
        hint: q.inContentionHint,
      };
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
