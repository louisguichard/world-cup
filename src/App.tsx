import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Database,
  Dices,
  Lock,
  Network,
  RotateCcw,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
  X
} from "lucide-react";
import type {
  BracketMatch,
  DataLoadResult,
  GroupLetter,
  GroupStanding,
  Match,
  MatchWithScore,
  OpponentProbability,
  ScoreOverride,
  Stage,
  Team,
  TeamRecord,
  TeamSimulationSummary,
  TournamentSimulationResult
} from "./types";
import { groupLetters } from "./types";
import SpeakeaBanner from "./SpeakeaBanner";
import { knockoutSchedule, type KnockoutInfo } from "./data/knockoutSchedule";
import { loadWorldCupData } from "./lib/dataSources";
import { formatPercent } from "./lib/normalize";
import { projectTournament, simulateTournamentOutcomes, toTeamsById } from "./lib/tournament";

const STORAGE_KEY = "world-cup-2026-score-overrides";
const PICKS_KEY = "world-cup-2026-bracket-picks";
const DATA_CACHE_KEY = "world-cup-2026-data-cache-v4";
const MONTE_CARLO_ITERATIONS = 4200;
const MONTE_CARLO_SEED = 2026;
const AUTHOR_GITHUB_URL = "https://github.com/louisguichard/world-cup";
const AUTHOR_SITE_URL = "https://louisguichard.fr/";
const POLYMARKET_EVENT_BASE_URL = "https://polymarket.com/event";
const POLYMARKET_TITLE_URL = `${POLYMARKET_EVENT_BASE_URL}/world-cup-winner`;

type SimulationWorkerResponse = {
  requestId: number;
  result?: TournamentSimulationResult;
  error?: string;
};

type AppTab = "tournament" | "probabilistic" | "upcoming";

type ScheduleEntry = {
  id: string;
  date: string;
  stageLabel: string;
  venue?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeSeedLabel?: string;
  awaySeedLabel?: string;
  status?: Match["status"];
  homeScore?: number;
  awayScore?: number;
  prediction?: Match["prediction"];
  homeWinProbability?: number;
  marketSlug?: string;
  kind: "group" | "knockout";
  group?: GroupLetter;
};

const stageLabels: Record<Stage, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  Final: "Final"
};
const stageShort: Record<Stage, string> = {
  R32: "R32",
  R16: "R16",
  QF: "QF",
  SF: "SF",
  Final: "Final"
};
const stageColumns: Record<Stage, number> = { R32: 1, R16: 2, QF: 3, SF: 4, Final: 5 };
const bracketRows: Record<string, number> = {
  M74: 1,
  M77: 3,
  M73: 5,
  M75: 7,
  M83: 9,
  M84: 11,
  M81: 13,
  M82: 15,
  M76: 17,
  M78: 19,
  M79: 21,
  M80: 23,
  M86: 25,
  M88: 27,
  M85: 29,
  M87: 31,
  M89: 2,
  M90: 6,
  M93: 10,
  M94: 14,
  M91: 18,
  M92: 22,
  M95: 26,
  M96: 30,
  M97: 4,
  M98: 12,
  M99: 20,
  M100: 28,
  M101: 8,
  M102: 24,
  M104: 16
};
const bracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];

function loadOverrides(): Record<string, ScoreOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ScoreOverride>) : {};
  } catch {
    return {};
  }
}

function loadPicks(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function loadCachedData(): DataLoadResult | null {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: DataLoadResult };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function saveCachedData(data: DataLoadResult): void {
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // The simulator can still run without the warm cache.
  }
}

function defaultSelectedTeam(teams: Team[]): string {
  return teams.find((team) => team.name === "France")?.id ?? teams[0]?.id ?? "";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatKickoff(value: string): string {
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short" }).format(
    new Date(value)
  );
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  return `${date} · ${time}`;
}

function formatScheduleDay(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date(value));
}

function scheduleDateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildUpcomingSchedule(
  matches: Match[],
  scoredMatches: MatchWithScore[],
  bracket: BracketMatch[]
): ScheduleEntry[] {
  const scoredById = Object.fromEntries(scoredMatches.map((match) => [match.id, match]));
  const entries: ScheduleEntry[] = [];

  for (const match of matches) {
    if (match.status === "completed") continue;
    const scored = scoredById[match.id];
    entries.push({
      id: match.id,
      date: match.date,
      stageLabel: `Group ${match.group}`,
      venue: match.venue,
      group: match.group,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      status: match.status,
      homeScore: scored?.homeScore,
      awayScore: scored?.awayScore,
      prediction: match.prediction,
      kind: "group"
    });
  }

  for (const match of bracket) {
    const info = knockoutSchedule[match.id];
    if (!info) continue;
    entries.push({
      id: match.id,
      date: info.date,
      stageLabel: stageLabels[match.stage],
      venue: formatVenueTitle(info),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeSeedLabel: match.homeSeedLabel,
      awaySeedLabel: match.awaySeedLabel,
      homeWinProbability: match.homeWinProbability,
      marketSlug: match.marketSlug,
      kind: "knockout"
    });
  }

  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function formatVenueTitle(info: KnockoutInfo): string {
  const location =
    info.venueCity === info.hostCity ? info.hostCity : `${info.venueCity} (${info.hostCity})`;
  return `${info.stadium}, ${location}, ${info.country}`;
}

function polymarketEventUrl(marketSlug?: string): string | undefined {
  const slug = marketSlug?.trim();
  return slug ? `${POLYMARKET_EVENT_BASE_URL}/${encodeURIComponent(slug)}` : undefined;
}

function useColumnCount(): number {
  const compute = () => {
    if (typeof window === "undefined") return 4;
    const width = window.innerWidth;
    if (width > 1300) return 4;
    if (width > 960) return 3;
    if (width > 680) return 2;
    return 1;
  };
  const [columns, setColumns] = useState(compute);
  useEffect(() => {
    const onResize = () => setColumns(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return columns;
}

function sourceLabel(match: MatchWithScore): string {
  if (match.source === "manual") return "Edited";
  if (match.status === "live" && match.source === "espn") return "Live";
  if (match.locked) return match.status === "live" ? "Live" : "Result";
  if (match.prediction?.method === "polymarket") return "Polymarket";
  return "Model";
}

function sourceClass(match: MatchWithScore): string {
  if (match.source === "manual") return "manual";
  if (match.status === "live" && match.source === "espn") return "espn";
  if (match.locked) return "espn";
  return match.prediction?.method === "polymarket" ? "polymarket" : "model";
}

function App() {
  const [data, setData] = useState<DataLoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>("tournament");
  const [view, setView] = useState<"app" | "method">("app");
  const [tournamentOpenGroup, setTournamentOpenGroup] = useState<GroupLetter | null>(null);
  const [groupFocusRequest, setGroupFocusRequest] = useState(0);
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>(() => loadOverrides());
  const [bracketPicks, setBracketPicks] = useState<Record<string, string>>(() => loadPicks());
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [simulations, setSimulations] = useState<TournamentSimulationResult | null>(null);
  const simulationRequestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = loadCachedData();
      if (cached) {
        setData(cached);
        setSelectedTeamId((current) => (current && cached.teams.some((team) => team.id === current) ? current : defaultSelectedTeam(cached.teams)));
      }

      setLoading(!cached);
      setError(null);
      try {
        const result = await loadWorldCupData();
        if (cancelled) return;
        saveCachedData(result);
        setData(result);
        setSelectedTeamId((current) => {
          if (current && result.teams.some((team) => team.id === current)) return current;
          return defaultSelectedTeam(result.teams);
        });
      } catch (loadError) {
        if (!cancelled && !cached) setError(loadError instanceof Error ? loadError.message : "Unable to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    if (!data) return;

    const completedMatchIds = new Set(
      data.matches.filter((match) => match.status === "completed").map((match) => match.id)
    );
    if (!completedMatchIds.size) return;

    setOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const matchId of Object.keys(next)) {
        if (completedMatchIds.has(matchId)) {
          delete next[matchId];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [data]);

  useEffect(() => {
    localStorage.setItem(PICKS_KEY, JSON.stringify(bracketPicks));
  }, [bracketPicks]);

  useEffect(() => {
    if (!data) {
      setSimulations(null);
      return;
    }

    let cancelled = false;
    let fallbackTimer: number | undefined;
    const requestId = simulationRequestRef.current + 1;
    simulationRequestRef.current = requestId;

    const runFallback = () => {
      fallbackTimer = window.setTimeout(() => {
        if (cancelled) return;
        const result = simulateTournamentOutcomes(
          data.teams,
          data.matches,
          data.knockoutMarkets,
          MONTE_CARLO_ITERATIONS,
          MONTE_CARLO_SEED
        );
        if (!cancelled && simulationRequestRef.current === requestId) setSimulations(result);
      }, 0);
    };

    if (typeof Worker === "undefined") {
      runFallback();
      return () => {
        cancelled = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
      };
    }

    const worker = new Worker(new URL("./workers/simulationWorker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      if (cancelled || event.data.requestId !== requestId) return;
      if (event.data.result) {
        setSimulations(event.data.result);
      } else {
        runFallback();
      }
      worker.terminate();
    };

    worker.onerror = () => {
      if (!cancelled) runFallback();
      worker.terminate();
    };

    worker.postMessage({
      requestId,
      teams: data.teams,
      matches: data.matches,
      knockoutMarkets: data.knockoutMarkets,
      iterations: MONTE_CARLO_ITERATIONS,
      seed: MONTE_CARLO_SEED
    });

    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      worker.terminate();
    };
  }, [data]);

  const projection = useMemo(
    () => (data ? projectTournament(data.teams, data.matches, data.knockoutMarkets, overrides, bracketPicks) : null),
    [data, overrides, bracketPicks]
  );
  const teamsById = useMemo(() => (data ? toTeamsById(data.teams) : {}), [data]);
  const simulation = selectedTeamId ? simulations?.teamSummaries[selectedTeamId] ?? null : null;
  const championOdds = simulations?.championOdds ?? [];

  const stats = useMemo(() => {
    const matches = data?.matches ?? [];
    return {
      real: matches.filter((match) => match.status === "completed").length,
      live: matches.filter((match) => match.status === "live").length,
      polymarket: matches.filter((match) => match.status === "scheduled" && match.prediction?.method === "polymarket").length,
      edited: Object.keys(overrides).length + Object.keys(bracketPicks).length
    };
  }, [data, overrides, bracketPicks]);
  const championId = projection?.bracket.find((match) => match.id === "M104")?.winnerTeamId;
  const upcomingSchedule = useMemo(
    () => (data && projection ? buildUpcomingSchedule(data.matches, projection.scoredMatches, projection.bracket) : []),
    [data, projection]
  );

  const updateScore = (match: MatchWithScore, side: "home" | "away", value: number) => {
    if (match.status === "completed" || match.locked) return;
    const nextValue = Math.max(0, Math.min(20, Number.isFinite(value) ? value : 0));
    setOverrides((current) => ({
      ...current,
      [match.id]: {
        homeScore: side === "home" ? nextValue : current[match.id]?.homeScore ?? match.homeScore,
        awayScore: side === "away" ? nextValue : current[match.id]?.awayScore ?? match.awayScore
      }
    }));
  };

  const clearGroupOverrides = (matchIds: string[]) => {
    setOverrides((current) => {
      const next = { ...current };
      for (const id of matchIds) delete next[id];
      return next;
    });
  };

  const clearOverride = (matchId: string) => clearGroupOverrides([matchId]);

  const pickWinner = (matchId: string, teamId?: string, predictedWinnerId?: string) => {
    if (!teamId) return;
    setBracketPicks((current) => {
      const next = { ...current };
      if (teamId === predictedWinnerId || next[matchId] === teamId) delete next[matchId];
      else next[matchId] = teamId;
      return next;
    });
  };

  const resetBracket = () => setBracketPicks({});

  const resetAll = () => {
    setOverrides({});
    setBracketPicks({});
  };

  const navigateToGroup = (group: GroupLetter) => {
    setView("app");
    setTab("tournament");
    setTournamentOpenGroup(group);
    setGroupFocusRequest((count) => count + 1);
  };

  if (loading && !data) {
    return (
      <main className="app-shell app-loading">
        <span className="brand-mark loading-mark" aria-hidden="true">
          <Trophy size={26} strokeWidth={2} />
        </span>
        <strong>World Cup Lab</strong>
        <span className="app-loading-note">
          <span className="loader sm" />
          Loading live scores and markets…
        </span>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="app-shell app-error">
        <span className="brand-mark error-mark" aria-hidden="true">
          <Trophy size={26} strokeWidth={2} />
        </span>
        <strong>The simulator could not load.</strong>
        <span>{error}</span>
        <button className="primary-button" onClick={() => location.reload()}>
          <RotateCcw size={16} />
          Try again
        </button>
      </main>
    );
  }

  return (
    <>
      <SpeakeaBanner />
      <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("app")} aria-label="Home">
          <span className="brand-mark" aria-hidden="true">
            <Trophy size={22} strokeWidth={2} />
          </span>
          <span className="brand-text">
            <strong>World Cup Lab</strong>
            <small>WC 2026 · Simulator</small>
          </span>
        </button>
        <div className="topbar-actions">
          <div className="segmented" role="tablist" aria-label="View">
            <button
              className={view === "app" && tab === "tournament" ? "active" : ""}
              onClick={() => {
                setView("app");
                setTab("tournament");
              }}
            >
              <Trophy size={16} />
              <span>Tournament</span>
            </button>
            <button
              className={view === "app" && tab === "probabilistic" ? "active" : ""}
              onClick={() => {
                setView("app");
                setTab("probabilistic");
              }}
            >
              <BarChart3 size={16} />
              <span>Probabilities</span>
            </button>
            <button
              className={view === "app" && tab === "upcoming" ? "active" : ""}
              onClick={() => {
                setView("app");
                setTab("upcoming");
              }}
            >
              <CalendarDays size={16} />
              <span>Upcoming</span>
            </button>
          </div>
          <button
            className={`method-link ${view === "method" ? "active" : ""}`}
            onClick={() => setView("method")}
          >
            <BookOpen size={16} />
            <span>Methodology</span>
          </button>
        </div>
      </header>

      {view === "method" ? (
        <MethodView onBack={() => setView("app")} />
      ) : (
        <>
          <section className="hero-panel">
            <div className="eyebrow">United States · Canada · Mexico</div>
            <h1>
              The road to the final, <span className="accent">yours to simulate.</span>
            </h1>
            <p>
              Live scores, market-implied odds, FIFA tie-breakers and thousands of Monte-Carlo runs — explore the bracket,
              then rewrite it as you like.
            </p>
          </section>

          <section className="status-strip">
            {stats.live > 0 ? (
              <span className="stat-chip">
                <b>{stats.live}</b> live editable
              </span>
            ) : null}
            {stats.edited > 0 ? (
              <button className="stat-chip edited" onClick={resetAll} title="Reset all your edits">
                <b>{stats.edited}</b> {stats.edited > 1 ? "edits" : "edit"} · reset
              </button>
            ) : null}
            <span className="updated-at">{data?.loadedAt ? `Updated ${formatDate(data.loadedAt)}` : ""}</span>
          </section>

          {data?.warnings.length ? (
            <section className="warnings">
              {data.warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </section>
          ) : null}

          {tab === "tournament" && data && projection ? (
            <TournamentView
              teamsById={teamsById}
              groups={projection.standings}
              scoredMatches={projection.scoredMatches}
              bestThirds={projection.bestThirds}
              qualifiedThirdGroups={projection.qualifiedThirdGroups}
              bracket={projection.bracket}
              bracketPicks={bracketPicks}
              overrides={overrides}
              openGroup={tournamentOpenGroup}
              onOpenGroupChange={setTournamentOpenGroup}
              groupFocusRequest={groupFocusRequest}
              onScoreChange={updateScore}
              onClearGroup={clearGroupOverrides}
              onResetMatch={clearOverride}
              onPickWinner={pickWinner}
              onResetBracket={resetBracket}
            />
          ) : null}

          {tab === "probabilistic" && data && !simulation ? (
            <section className="probability-prep">
              <span className="loader sm" />
              <strong>Preparing Monte Carlo paths…</strong>
              <p>The bracket is being replayed {MONTE_CARLO_ITERATIONS.toLocaleString("en-GB")} times.</p>
            </section>
          ) : null}

          {tab === "probabilistic" && data && simulation ? (
            <ProbabilityView
              teams={data.teams}
              teamsById={teamsById}
              selectedTeamId={selectedTeamId}
              onSelectTeam={setSelectedTeamId}
              simulation={simulation}
              championOdds={championOdds}
            />
          ) : null}

          {tab === "upcoming" && data && projection ? (
            <UpcomingView entries={upcomingSchedule} teamsById={teamsById} onNavigateToGroup={navigateToGroup} />
          ) : null}
        </>
      )}
      <AppFooter />
      </main>
    </>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <span>
        Made by{" "}
        <a href={AUTHOR_SITE_URL} target="_blank" rel="noreferrer">
          Louis
        </a>{" "}
        with ❤️ from France
      </span>
      <nav aria-label="Project links">
        <a href={AUTHOR_GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </footer>
  );
}

function TournamentView({
  teamsById,
  groups,
  scoredMatches,
  bestThirds,
  qualifiedThirdGroups,
  bracket,
  bracketPicks,
  overrides,
  openGroup,
  onOpenGroupChange,
  groupFocusRequest,
  onScoreChange,
  onClearGroup,
  onResetMatch,
  onPickWinner,
  onResetBracket
}: {
  teamsById: Record<string, Team>;
  groups: GroupStanding[];
  scoredMatches: MatchWithScore[];
  bestThirds: TeamRecord[];
  qualifiedThirdGroups: GroupLetter[];
  bracket: BracketMatch[];
  bracketPicks: Record<string, string>;
  overrides: Record<string, ScoreOverride>;
  openGroup: GroupLetter | null;
  onOpenGroupChange: (group: GroupLetter | null) => void;
  groupFocusRequest: number;
  onScoreChange: (match: MatchWithScore, side: "home" | "away", value: number) => void;
  onClearGroup: (matchIds: string[]) => void;
  onResetMatch: (matchId: string) => void;
  onPickWinner: (matchId: string, teamId?: string, predictedWinnerId?: string) => void;
  onResetBracket: () => void;
}) {
  const detailRef = useRef<HTMLDivElement | null>(null);
  const groupPanelRefs = useRef<Partial<Record<GroupLetter, HTMLElement | null>>>({});

  const matchesByGroup = useMemo(() => {
    const map = new Map<GroupLetter, MatchWithScore[]>();
    for (const group of groupLetters) map.set(group, []);
    for (const match of scoredMatches) map.get(match.group)?.push(match);
    return map;
  }, [scoredMatches]);

  const columns = useColumnCount();

  useEffect(() => {
    if (!openGroup) return;
    groupPanelRefs.current[openGroup]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [openGroup, groupFocusRequest]);

  const toggleGroup = (group: GroupLetter) => {
    onOpenGroupChange(openGroup === group ? null : group);
  };

  const openIndex = openGroup ? groups.findIndex((standing) => standing.group === openGroup) : -1;
  const insertionIndex = openIndex >= 0 ? Math.min(groups.length - 1, (Math.floor(openIndex / columns) + 1) * columns - 1) : -1;
  const openMatches = openGroup ? matchesByGroup.get(openGroup) ?? [] : [];

  return (
    <section className="tournament-layout">
      <BracketView
        bracket={bracket}
        bracketPicks={bracketPicks}
        teamsById={teamsById}
        onPickWinner={onPickWinner}
        onResetBracket={onResetBracket}
      />

      <div className="section-heading">
        <div>
          <span className="section-kicker">Group stage</span>
          <h2>Projected standings</h2>
        </div>
        <span className="quiet-note">Tap any group to open its matches.</span>
      </div>

      <div className="groups-grid">
        {groups.map((standing, index) => (
          <Fragment key={standing.group}>
            <GroupPanel
              standing={standing}
              teamsById={teamsById}
              qualifiedThirdGroups={qualifiedThirdGroups}
              active={openGroup === standing.group}
              panelRef={(node) => {
                groupPanelRefs.current[standing.group] = node;
              }}
              onToggle={() => toggleGroup(standing.group)}
            />
            {openGroup && index === insertionIndex ? (
              <div className="group-detail" ref={detailRef}>
                <div className="group-detail-head">
                  <div>
                    <span className="section-kicker">Group {openGroup}</span>
                    <h3>{openMatches.length} matches</h3>
                  </div>
                  <div className="group-detail-actions">
                    {openMatches.some((match) => overrides[match.id]) ? (
                      <button className="text-button" onClick={() => onClearGroup(openMatches.map((match) => match.id))}>
                        Reset group
                      </button>
                    ) : null}
                    <button className="icon-button sm" onClick={() => onOpenGroupChange(null)} aria-label="Close">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="match-grid">
                  {openMatches.map((match) => (
                    <ScoreEditor
                      key={match.id}
                      match={match}
                      teamsById={teamsById}
                      onScoreChange={onScoreChange}
                      onReset={onResetMatch}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </Fragment>
        ))}
      </div>

      <aside className="thirds-panel">
        <div className="section-title">
          <div>
            <span className="section-kicker">Cut line</span>
            <h2>Best third-placed teams</h2>
          </div>
          <span className="qualified-badge">Top 8 advance</span>
        </div>
        <div className="thirds-list">
          {bestThirds.map((record, index) => {
            const team = teamsById[record.teamId];
            return (
              <div className={`third-row ${index < 8 ? "qualified" : ""}`} key={record.teamId}>
                <span>{index + 1}</span>
                <img src={team.logo} alt="" />
                <strong>{team.shortName}</strong>
                <em>Grp {record.group}</em>
                <span className="third-gd">{record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}</span>
                <b>{record.points} pts</b>
              </div>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

function GroupPanel({
  standing,
  teamsById,
  qualifiedThirdGroups,
  active,
  panelRef,
  onToggle
}: {
  standing: GroupStanding;
  teamsById: Record<string, Team>;
  qualifiedThirdGroups: GroupLetter[];
  active: boolean;
  panelRef?: (node: HTMLElement | null) => void;
  onToggle: () => void;
}) {
  const projectedQualifiers = standing.rows
    .slice(0, 3)
    .filter((record, index) => index < 2 || qualifiedThirdGroups.includes(record.group));

  return (
    <article className={`group-panel ${active ? "active" : ""}`} ref={panelRef} id={`group-panel-${standing.group}`}>
      <button className="group-header" onClick={onToggle}>
        <div>
          <h2>Group {standing.group}</h2>
          <div className="mini-qualifiers">
            {projectedQualifiers.map((record) => {
              const team = teamsById[record.teamId];
              return <img src={team.logo} alt="" key={record.teamId} title={team.name} />;
            })}
          </div>
        </div>
        <span className="tap-hint">
          {active ? "Close" : "Open"}
          <ChevronDown size={14} className={active ? "flip" : ""} />
        </span>
      </button>
      <table className="standing-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Pts</th>
            <th>GD</th>
          </tr>
        </thead>
        <tbody>
          {standing.rows.map((record, index) => {
            const team = teamsById[record.teamId];
            const qualified = index < 2 || (index === 2 && qualifiedThirdGroups.includes(record.group));
            return (
              <tr className={qualified ? "qualified" : ""} key={record.teamId}>
                <td>
                  <span className="rank">{index + 1}</span>
                  <img src={team.logo} alt="" />
                  <strong>{team.shortName}</strong>
                </td>
                <td>{record.points}</td>
                <td>{record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function ScoreEditor({
  match,
  teamsById,
  onScoreChange,
  onReset
}: {
  match: MatchWithScore;
  teamsById: Record<string, Team>;
  onScoreChange: (match: MatchWithScore, side: "home" | "away", value: number) => void;
  onReset: (matchId: string) => void;
}) {
  const home = teamsById[match.homeTeamId];
  const away = teamsById[match.awayTeamId];
  const marketUrl = match.prediction?.method === "polymarket" ? polymarketEventUrl(match.prediction.marketSlug) : undefined;
  const resetTitle = match.status === "live" ? "Reset to live score" : "Reset to prediction";

  return (
    <div className={`match-row ${match.locked ? "locked" : ""}`}>
      <div className="match-meta">
        <span>
          {match.locked ? <Lock size={11} /> : null}
          {formatDate(match.date)}
        </span>
        {match.source === "manual" ? (
          <button className="match-source manual reset" onClick={() => onReset(match.id)} title={resetTitle}>
            <RotateCcw size={11} />
            Edited
          </button>
        ) : marketUrl ? (
          <a className={`match-source ${sourceClass(match)} linked`} href={marketUrl} target="_blank" rel="noreferrer">
            {sourceLabel(match)}
          </a>
        ) : (
          <span className={`match-source ${sourceClass(match)}`}>{sourceLabel(match)}</span>
        )}
      </div>
      <div className="score-line">
        <TeamLabel team={home} />
        <ScoreBox value={match.homeScore} disabled={match.locked} onChange={(value) => onScoreChange(match, "home", value)} />
        <span className="score-separator">–</span>
        <ScoreBox value={match.awayScore} disabled={match.locked} onChange={(value) => onScoreChange(match, "away", value)} />
        <TeamLabel team={away} align="right" />
      </div>
    </div>
  );
}

function ScoreBox({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      className="score-input"
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      value={text}
      disabled={disabled}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        if (raw === "") return;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        if (text === "") {
          onChange(0);
          setText("0");
        }
      }}
      aria-label="Score"
    />
  );
}

function TeamLabel({ team, align = "left" }: { team: Team; align?: "left" | "right" }) {
  return (
    <span className={`team-label ${align}`}>
      <img src={team.logo} alt="" />
      <span>{team.shortName}</span>
    </span>
  );
}

function BracketView({
  bracket,
  bracketPicks,
  teamsById,
  onPickWinner,
  onResetBracket
}: {
  bracket: BracketMatch[];
  bracketPicks: Record<string, string>;
  teamsById: Record<string, Team>;
  onPickWinner: (matchId: string, teamId?: string, predictedWinnerId?: string) => void;
  onResetBracket: () => void;
}) {
  const champion = bracket.find((match) => match.id === "M104")?.winnerTeamId;
  const pickCount = Object.keys(bracketPicks).length;
  const orderedByStage = useMemo(() => {
    const byStage: Record<Stage, BracketMatch[]> = { R32: [], R16: [], QF: [], SF: [], Final: [] };
    for (const match of bracket) byStage[match.stage].push(match);
    for (const stage of bracketStages) {
      byStage[stage].sort((a, b) => (bracketRows[a.id] ?? 0) - (bracketRows[b.id] ?? 0));
    }
    return byStage;
  }, [bracket]);

  return (
    <section className="bracket-section">
      <div className="section-title">
        <div>
          <span className="section-kicker">Knockout</span>
          <h2>Scenario bracket</h2>
        </div>
        <div className="bracket-actions">
          {pickCount > 0 ? (
            <button className="text-button" onClick={onResetBracket}>
              <RotateCcw size={14} />
              Reset bracket
            </button>
          ) : null}
          {champion ? (
            <span className="champion-pill">
              <Trophy size={15} />
              {teamsById[champion]?.shortName}
            </span>
          ) : null}
        </div>
      </div>
      <p className="bracket-hint">
        Click a team to send it through — the whole bracket recomputes from your pick.
      </p>
      <div className="bracket-scroll">
        <div className="bracket-head">
          {bracketStages.map((stage) => (
            <h3 key={stage} style={{ gridColumn: stageColumns[stage] }}>
              {stageShort[stage]}
            </h3>
          ))}
        </div>
        <div className="bracket-rounds">
          {bracketStages.map((stage) => (
            <div className={`bracket-round ${stage === "Final" ? "is-final" : ""}`} key={stage}>
              {orderedByStage[stage].map((match) => (
                <div className="bracket-cell" key={match.id}>
                  <BracketCard
                    match={match}
                    teamsById={teamsById}
                    picked={Boolean(bracketPicks[match.id])}
                    onPickWinner={onPickWinner}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BracketCard({
  match,
  teamsById,
  picked,
  onPickWinner
}: {
  match: BracketMatch;
  teamsById: Record<string, Team>;
  picked: boolean;
  onPickWinner: (matchId: string, teamId?: string, predictedWinnerId?: string) => void;
}) {
  const home = match.homeTeamId ? teamsById[match.homeTeamId] : undefined;
  const away = match.awayTeamId ? teamsById[match.awayTeamId] : undefined;
  const decided = Boolean(home && away);
  const info = knockoutSchedule[match.id];
  const venueTitle = info ? formatVenueTitle(info) : "";
  const homeProb = match.homeWinProbability;
  const awayProb = typeof homeProb === "number" ? 1 - homeProb : undefined;
  const predictedWinnerId =
    home && away && typeof homeProb === "number" ? (homeProb >= 0.5 ? home.id : away.id) : match.winnerTeamId;

  return (
    <article className={`bracket-card ${picked ? "picked" : ""}`}>
      <div className="bracket-card-head">
        <span className="match-date" title={venueTitle}>
          {info ? formatKickoff(info.date) : ""}
        </span>
        <span className="match-city" title={venueTitle || match.id}>
          {info ? info.hostCity : match.id}
        </span>
      </div>
      <BracketTeam
        team={home}
        probability={decided ? homeProb : undefined}
        winner={match.winnerTeamId === home?.id}
        clickable={decided}
        onClick={() => onPickWinner(match.id, home?.id, predictedWinnerId)}
      />
      <BracketTeam
        team={away}
        probability={decided ? awayProb : undefined}
        winner={match.winnerTeamId === away?.id}
        clickable={decided}
        onClick={() => onPickWinner(match.id, away?.id, predictedWinnerId)}
      />
    </article>
  );
}

function BracketTeam({
  team,
  probability,
  winner,
  clickable,
  onClick
}: {
  team?: Team;
  probability?: number;
  winner: boolean;
  clickable: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`bracket-team ${winner ? "winner" : ""}`}
      onClick={onClick}
      disabled={!clickable}
      type="button"
      title={team ? `${team.name} — ${typeof probability === "number" ? formatPercent(probability, 0) : "?"} to advance` : undefined}
    >
      {team ? <img src={team.logo} alt="" /> : <span className="bracket-dot" />}
      <span>{team?.shortName ?? "TBD"}</span>
      {typeof probability === "number" ? <b>{formatPercent(probability, 0)}</b> : null}
    </button>
  );
}

type OpponentDisplayRow = {
  opponentId?: string;
  probability: number;
  count: number;
};

function opponentRowsWithOther(rows: OpponentProbability[], visibleCount = 6): OpponentDisplayRow[] {
  const visible = rows.slice(0, visibleCount);
  const hidden = rows.slice(visibleCount);
  if (!hidden.length) {
    return visible;
  }

  return [
    ...visible,
    {
      probability: hidden.reduce((sum, row) => sum + row.probability, 0),
      count: hidden.reduce((sum, row) => sum + row.count, 0)
    }
  ];
}

function ProbabilityView({
  teams,
  teamsById,
  selectedTeamId,
  onSelectTeam,
  simulation,
  championOdds
}: {
  teams: Team[];
  teamsById: Record<string, Team>;
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  simulation: TeamSimulationSummary;
  championOdds: Array<{ teamId: string; probability: number }>;
}) {
  const [showMarketOdds, setShowMarketOdds] = useState(false);
  const selected = teamsById[selectedTeamId];
  const stageOrder: Array<keyof TeamSimulationSummary["stageReach"]> = ["R32", "R16", "QF", "SF", "Final", "Champion"];
  const topOdds = useMemo(() => championOdds.filter((row) => row.probability > 0).slice(0, 8), [championOdds]);
  const sortedTeams = useMemo(() => teams.slice().sort((a, b) => a.name.localeCompare(b.name)), [teams]);
  const maxOdds = topOdds[0]?.probability ?? 1;

  return (
    <section className="probability-layout">
      <div className="probability-columns">
        <div className="probability-column">
          <div className="section-heading compact">
            <div>
              <span className="section-kicker">Monte Carlo</span>
              <h2>Title odds</h2>
            </div>
            <button className={`subtle-toggle ${showMarketOdds ? "active" : ""}`} onClick={() => setShowMarketOdds((value) => !value)}>
              {showMarketOdds ? "Hide Polymarket" : "Show Polymarket"}
            </button>
          </div>
          <div className="title-odds">
            <div className={`title-row title-row-head ${showMarketOdds ? "with-market" : ""}`}>
              <span>#</span>
              <span />
              <strong>Team</strong>
              <span />
              <b>Model</b>
              {showMarketOdds ? <b>Mkt</b> : null}
            </div>
            {topOdds.map((row, index) => {
              const team = teamsById[row.teamId];
              if (!team) return null;
              const selectTeam = () => onSelectTeam(row.teamId);
              return (
                <div
                  key={row.teamId}
                  className={`title-row ${showMarketOdds ? "with-market" : ""} ${row.teamId === selectedTeamId ? "selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={selectTeam}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectTeam();
                    }
                  }}
                >
                  <span className="title-rank">{index + 1}</span>
                  <img src={team.logo} alt="" />
                  <strong>{team.shortName}</strong>
                  <div className="title-track">
                    <i style={{ width: `${Math.max(3, (row.probability / maxOdds) * 100)}%` }} />
                  </div>
                  <b>{formatPercent(row.probability, 1)}</b>
                  {showMarketOdds ? (
                    team.titleProbability ? (
                      <a
                        className="market-odd"
                        href={POLYMARKET_TITLE_URL}
                        target="_blank"
                        rel="noreferrer"
                        title="Open the Polymarket World Cup Winner market"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {formatPercent(team.titleProbability, 1)}
                      </a>
                    ) : (
                      <span className="market-odd">—</span>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="probability-column">
          <div className="section-heading compact path-heading">
            <div>
              <span className="section-kicker">{selected ? selected.name : "Team"}</span>
              <h2>Likely path</h2>
            </div>
            <div className="team-picker">
              {selected ? <img src={selected.logo} alt="" /> : null}
              <select value={selectedTeamId} onChange={(event) => onSelectTeam(event.target.value)}>
                {sortedTeams.map((team) => (
                  <option value={team.id} key={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="view-note">
            Real results are locked in; every remaining match is sampled from its market-implied (or model) probabilities, and
            the full bracket is replayed {simulation.iterations.toLocaleString("en-GB")} times. Figures below are how often{" "}
            {selected ? selected.shortName : "the team"} reaches each round.
          </p>

          <div className="stage-probabilities">
            {stageOrder.map((stage) => (
              <div className="probability-row" key={stage}>
                <span>{stage === "Champion" ? "Champion" : stageLabels[stage]}</span>
                <div className="probability-track">
                  <div style={{ width: `${simulation.stageReach[stage] * 100}%` }} />
                </div>
                <strong>{formatPercent(simulation.stageReach[stage], 1)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="opponent-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Draw</span>
            <h2>Most likely opponents</h2>
          </div>
        </div>
        <div className="opponent-grid">
          {(["R32", "R16", "QF", "SF", "Final"] as Stage[]).map((stage) => (
            <article className="opponent-panel" key={stage}>
              <h3>{stageShort[stage]}</h3>
              {simulation.opponents[stage].length ? (
                opponentRowsWithOther(simulation.opponents[stage]).map((item) => {
                  const team = item.opponentId ? teamsById[item.opponentId] : undefined;
                  return (
                    <div className={`opponent-row ${team ? "" : "other"}`} key={item.opponentId ?? `${stage}-other`}>
                      {team ? <img src={team.logo} alt="" /> : <span className="opponent-dot" />}
                      <span>{team?.shortName ?? "Others"}</span>
                      <div>
                        <i style={{ width: `${Math.min(100, item.probability * 100)}%` }} />
                      </div>
                      <b>{formatPercent(item.probability, 1)}</b>
                    </div>
                  );
                })
              ) : (
                <p>No meetings in the simulations.</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UpcomingView({
  entries,
  teamsById,
  onNavigateToGroup
}: {
  entries: ScheduleEntry[];
  teamsById: Record<string, Team>;
  onNavigateToGroup: (group: GroupLetter) => void;
}) {
  const groupedDays = useMemo(() => {
    const groups: Array<{ key: string; label: string; entries: ScheduleEntry[] }> = [];
    for (const entry of entries) {
      const key = scheduleDateKey(entry.date);
      const last = groups[groups.length - 1];
      if (last?.key === key) {
        last.entries.push(entry);
      } else {
        groups.push({ key, label: formatScheduleDay(entry.date), entries: [entry] });
      }
    }
    return groups;
  }, [entries]);

  const groupCount = entries.filter((entry) => entry.kind === "group").length;
  const knockoutCount = entries.filter((entry) => entry.kind === "knockout").length;

  return (
    <section className="schedule-layout">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Fixtures</span>
          <h2>Upcoming matches</h2>
        </div>
        <span className="quiet-note">
          {groupCount} group · {knockoutCount} knockout
        </span>
      </div>
      <p className="view-note schedule-note">
        Scheduled fixtures show win probabilities from Polymarket or the strength model. Live matches show the current score.
      </p>

      {entries.length ? (
        <div className="schedule-days">
          {groupedDays.map((day) => (
            <article className="schedule-day" key={day.key}>
              <h3>{day.label}</h3>
              <div className="schedule-list">
                {day.entries.map((entry) => (
                  <ScheduleRow key={entry.id} entry={entry} teamsById={teamsById} onNavigateToGroup={onNavigateToGroup} />
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="view-note">No upcoming fixtures are scheduled right now.</p>
      )}
    </section>
  );
}

function ScheduleTeamLabel({
  team,
  label,
  align = "left"
}: {
  team?: Team;
  label: string;
  align?: "left" | "right";
}) {
  return (
    <span className={`team-label ${align}`}>
      {team ? <img src={team.logo} alt="" /> : <span className="schedule-dot" />}
      <span>{label}</span>
    </span>
  );
}

function ScheduleProbCenter({ entry }: { entry: ScheduleEntry }) {
  if (entry.status === "live" && typeof entry.homeScore === "number" && typeof entry.awayScore === "number") {
    return (
      <>
        <span className="score-display">{entry.homeScore}</span>
        <span className="score-separator">–</span>
        <span className="score-display">{entry.awayScore}</span>
      </>
    );
  }
  const homeP = entry.homeWinProbability ?? entry.prediction?.homeWin;
  const drawP = entry.prediction?.draw;
  const awayP =
    typeof entry.homeWinProbability === "number" ? 1 - entry.homeWinProbability : entry.prediction?.awayWin;
  if (typeof homeP !== "number" || typeof awayP !== "number") {
    return <span className="prob-vs">vs</span>;
  }
  return (
    <div className="prob-bar">
      <div className="prob-segment home" style={{ flex: homeP }}>
        {formatPercent(homeP, 0)}
      </div>
      {typeof drawP === "number" && drawP > 0 ? (
        <div className="prob-segment draw" style={{ flex: drawP }}>
          {formatPercent(drawP, 0)}
        </div>
      ) : null}
      <div className="prob-segment away" style={{ flex: awayP }}>
        {formatPercent(awayP, 0)}
      </div>
    </div>
  );
}

function ScheduleRow({
  entry,
  teamsById,
  onNavigateToGroup
}: {
  entry: ScheduleEntry;
  teamsById: Record<string, Team>;
  onNavigateToGroup: (group: GroupLetter) => void;
}) {
  const home = entry.homeTeamId ? teamsById[entry.homeTeamId] : undefined;
  const away = entry.awayTeamId ? teamsById[entry.awayTeamId] : undefined;
  const homeLabel = home?.name ?? entry.homeSeedLabel ?? "TBD";
  const awayLabel = away?.name ?? entry.awaySeedLabel ?? "TBD";
  const marketSlug =
    entry.kind === "group" && entry.prediction?.method === "polymarket"
      ? entry.prediction.marketSlug
      : entry.marketSlug;
  const marketUrl = polymarketEventUrl(marketSlug);
  const kickoffTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.date));

  return (
    <div className={`match-row schedule-row ${entry.status === "live" ? "live" : ""}`}>
      <div className="match-meta">
        <div className="schedule-meta-start">
          <span className="schedule-kickoff">
            {kickoffTime}
            {entry.status === "live" ? <em className="schedule-live">Live</em> : null}
          </span>
          {entry.kind === "group" && entry.group ? (
            <button
              type="button"
              className="schedule-stage link"
              onClick={() => onNavigateToGroup(entry.group!)}
            >
              Group {entry.group}
            </button>
          ) : (
            <span className="schedule-stage">{entry.stageLabel}</span>
          )}
        </div>
        <div className="schedule-meta-end">
          {entry.kind === "knockout" ? (
            <span className="schedule-projected-teams">Projected teams</span>
          ) : null}
          {entry.venue ? <span className="schedule-venue">{entry.venue}</span> : null}
          {marketUrl ? (
            <a className="schedule-market" href={marketUrl} target="_blank" rel="noreferrer">
              Polymarket
            </a>
          ) : null}
        </div>
      </div>
      <div className="score-line">
        <ScheduleTeamLabel team={home} label={homeLabel} />
        <ScheduleProbCenter entry={entry} />
        <ScheduleTeamLabel team={away} label={awayLabel} align="right" />
      </div>
    </div>
  );
}

const methodSections = [
  {
    id: "overview",
    icon: <Sparkles size={18} />,
    title: "Overview",
    body: [
      "The simulator blends five ingredients: real results from ESPN, FIFA points, a small host advantage, per-match Polymarket markets, a Polymarket title-odds force calibration, and a tournament engine that follows the FIFA 2026 regulations.",
      "Three views sit on top of this engine. The Tournament view is a single editable scenario — you can change any score or knockout winner and watch the whole bracket recompute. The Probabilities view runs the same engine thousands of times to estimate how far a team is likely to go. The Upcoming view lists remaining group fixtures and the projected knockout schedule, with win probabilities from Polymarket or the strength model."
    ]
  },
  {
    id: "data",
    icon: <Database size={18} />,
    title: "Data sources",
    body: [
      "ESPN public scoreboard (fifa.world, 11–28 Jun 2026), filtered to the 72 group fixtures via the official “Group X” note. It provides teams, crests, kick-off times, live/final status, scores, and cards used for the fair-play tie-breaker.",
      "Polymarket per-match “Games” markets (series soccer-fifwc): moneyline prices matched to each fixture by team pair and kick-off. Group matches use the 1·X·2 market; knockout matches will use a two-way advance market when available, otherwise a 1·X·2 market plus a model split of the draw.",
      "Official FIFA men’s ranking (api.fifa.com): the DecimalTotalPoints field is the initial rating scale; the rank itself is kept for the final FIFA tie-breaker.",
      "Polymarket “World Cup Winner” outright market: no longer used as a direct base rating; it is used after an initial simulation pass to add a small calibration adjustment to each team’s strength."
    ]
  },
  {
    id: "score-model",
    icon: <Target size={18} />,
    title: "From 1·X·2 to a scoreline",
    body: [
      "Market prices are first renormalised, pᵢ = qᵢ / Σqⱼ, to remove the bookmaker overround and small rounding gaps.",
      "Goals are modelled with Negative Binomial marginals rather than pure Poisson, using variance μ + μ² / 4.2. A small Dixon-Coles correction (ρ = -0.08) adjusts low scores so the grid is less locked on 1–0 / 0–1.",
      "The two means λ are fitted by grid search from 0.25 to 3.55 goals (step 0.05), minimising the squared error between the score-grid probabilities P(X>Y), P(X=Y), P(X<Y) and the renormalised 1·X·2 probabilities.",
      "Deterministic display keeps the most likely 1·X·2 outcome, then chooses a stable seeded score among the five most plausible exact scores for that outcome, with flattened weights p^0.66 and a guardrail against very large margins. Monte-Carlo runs sample from the full score grid."
    ]
  },
  {
    id: "no-market",
    icon: <Network size={18} />,
    title: "Team strength model",
    body: [
      "Base rating = FIFA DecimalTotalPoints + host bonus (+55 United States, +45 Mexico, +35 Canada). Polymarket title odds are deliberately excluded here because they already contain bracket information.",
      "The rating itself is not bounded. The regularisation comes from the shrinkage in the market adjustment loop, the 50% market-adjustment weight, and the caps on market/result adjustments.",
      "Future Polymarket match markets reweight that base. For each priced known match, the market expected score E = P(win) + 0.5·P(draw), or P(advance) for two-way knockout markets, is converted to a target rating gap 180·logit(E). A small ridge-like iterative update moves both teams toward all their market-implied gaps, capped at ±135 rating points, then 50% of that learned market adjustment enters the final strength index.",
      "Completed matches add only a small capped update: K = 14, margin multiplier 1 + min(0.8, 0.45·log(1 + goal difference)), cap ±42. This lets real results matter without crushing a favourite for a draw.",
      "A 3,000-run calibration pass then compares raw simulated title odds with the Polymarket outright market and adds ΔR_title = clamp(60·(logit(p_market) − logit(p_model)), −50, +50) to the strength index. This lets the market inform team strength without being the initial rating source.",
      "Matches without a Polymarket market use the final adjusted rating: draw = clamp(0.29 − |ΔR| / 5200, 0.17, 0.30), then the remaining mass is split with an Elo-style curve."
    ]
  },
  {
    id: "engine",
    icon: <Dices size={18} />,
    title: "Bracket & Monte Carlo",
    body: [
      "Round-of-32 seeding follows the official FIFA bracket (M73–M88): the top two of each group plus the eight best third-placed teams, with the third-place assignment taken from FIFA’s 495-combination Annexe C table.",
      "Each Monte-Carlo iteration keeps the real results, samples every remaining group match, recomputes the 12 tables and the best-thirds cut line, then applies a light projected-form update before playing M73–M104.",
      "For a known knockout match, the engine first looks for a real Polymarket market around the scheduled kick-off. Only if none is found does it use P(advance) = clamp(1 / (1 + 10^(−ΔR/500)), 0.08, 0.92). The flatter 500-point scale keeps single-match knockout ties more volatile than the group-stage strength model. The deterministic view advances the favourite; you can override any winner by tapping a team.",
      "After the one-pass force calibration, all reported figures are simple frequencies ÷ iterations over 4,200 runs. Title odds and Likely Path use the same seed and iteration count, so a selected team’s Champion probability is comparable across both panels."
    ]
  },
  {
    id: "rules",
    icon: <ScrollText size={18} />,
    title: "Tie-breakers implemented",
    body: [
      "Group ranking: points → head-to-head mini-table among tied teams (points, goal difference, goals scored). If only part of the tie is resolved, those same head-to-head criteria are reapplied to the teams still tied before moving on.",
      "Remaining group ties: overall goal difference → goals scored → fair-play (cards) → FIFA ranking.",
      "Best third-placed: points → overall goal difference → goals scored → fair-play → FIFA ranking, exactly as in the FIFA regulations."
    ]
  },
  {
    id: "limits",
    icon: <Lock size={18} />,
    title: "Assumptions & limitations",
    body: [
      "The score grid is calibrated to 1·X·2 prices, not to exact-score odds, injuries, line-ups, fatigue, red cards, travel or weather.",
      "The Negative Binomial and Dixon-Coles parameters are heuristic, chosen for more realistic score variety. They should be back-tested before treating exact scores as betting-grade predictions.",
      "The outright market now calibrates team strength through one capped residual adjustment after an initial simulation pass. This is still a heuristic: the title market contains bracket/path information, so large residual adjustments should be read as diagnostics rather than pure estimates of player quality.",
      "Extra time and penalties are not modelled beyond a cosmetic “after extra time” tag, and far-future matches without a market fall back to the adjusted strength model."
    ]
  }
];

function MethodView({ onBack }: { onBack: () => void }) {
  const [activeId, setActiveId] = useState(methodSections[0].id);

  return (
    <section className="method-page">
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={15} />
        Back to the simulator
      </button>

      <header className="method-masthead">
        <span className="section-kicker">How it works</span>
        <h1>Methodology</h1>
        <p>
          Everything the simulator computes — the data it pulls, the models behind each prediction, the FIFA tie-breakers,
          and where the approach reaches its limits.
        </p>
      </header>

      <div className="method-body">
        <nav className="method-toc">
          {methodSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={activeId === section.id ? "active" : ""}
              onClick={(event) => {
                event.preventDefault();
                setActiveId(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {section.title}
            </a>
          ))}
        </nav>
        <div className="method-sections">
          {methodSections.map((section) => (
            <article id={section.id} className="method-block" key={section.id}>
              <div className="method-block-head">
                <span className="method-icon">{section.icon}</span>
                <h2>{section.title}</h2>
              </div>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;
