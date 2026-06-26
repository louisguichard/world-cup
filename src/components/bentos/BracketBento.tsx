import { useMemo } from "react";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { projectTournament } from "../../lib/tournament";
import { formatKickoffLabel, resolveKickoffByMatchId } from "../../services/ScheduleLinker";
import type { BracketGhostCandidate, BracketMatch, BracketSlotCertainty, Stage, Team } from "../../types";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import type { TeamThemeStatus } from "../team/TeamThemeRoot";

const bracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];
const stageColumns: Record<Stage, number> = { R32: 1, R16: 2, QF: 3, SF: 4, Final: 5 };

function GhostTeamList({
  ghosts,
  teamsById,
  showFrequency
}: {
  ghosts: BracketGhostCandidate[];
  teamsById: Record<string, Team>;
  showFrequency: boolean;
}) {
  if (ghosts.length === 0) return null;
  return (
    <div className="bracket-ghost-list">
      {ghosts.map(({ teamId, frequency }) => {
        const t = teamsById[teamId];
        return (
          <div key={teamId} className="bracket-ghost-team">
            {t?.logo ? <img src={t.logo} alt="" /> : <span className="bracket-dot" style={{ width: 12, height: 12 }} />}
            <span>{t?.shortName ?? teamId}</span>
            {showFrequency ? <span className="bracket-ghost-freq">{Math.round(frequency * 100)}%</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function BracketTeamReadonly({
  team,
  seedLabel,
  winner,
  certainty,
  ghosts,
  mode,
  teamsById,
  status = "default"
}: {
  team?: Team;
  seedLabel?: string;
  winner?: boolean;
  certainty?: BracketSlotCertainty;
  ghosts?: BracketGhostCandidate[];
  mode: "confirmed" | "projected";
  teamsById: Record<string, Team>;
  status?: TeamThemeStatus;
}) {
  const theme = useTeamTheme(team?.id);

  // In confirmed mode, only confirmed slots show the projected team solid.
  // All other slots render as TBD + ghost hints.
  const effectiveCertainty: BracketSlotCertainty =
    mode === "confirmed" && certainty !== "confirmed" ? "tbd" : (certainty ?? "projected");

  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;
  const visibleGhosts = ghosts?.slice(0, 2) ?? [];

  if (effectiveCertainty === "tbd") {
    return (
      <div className="bracket-team-slot">
        <div className="bracket-team bracket-team-tbd">
          <span className="bracket-dot" />
          <span>TBD</span>
        </div>
        {visibleGhosts.length > 0 ? (
          <>
            <div className="bracket-ghost-label">Possible</div>
            <GhostTeamList ghosts={visibleGhosts} teamsById={teamsById} showFrequency={false} />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bracket-team-slot">
      <div
        className={`bracket-team bracket-team-themed ${winner ? "winner" : ""}`}
        style={team ? theme : undefined}
        data-team-id={team?.id}
        data-status={resolvedStatus === "default" ? undefined : resolvedStatus}
      >
        {team?.logo ? <img src={team.logo} alt="" /> : <span className="bracket-dot" />}
        <span>{team?.shortName ?? seedLabel ?? "TBD"}</span>
        {winner ? <b>✓</b> : null}
      </div>
      {effectiveCertainty === "confirmed" ? (
        <div className="certainty-badge certainty-badge--confirmed">✓ Confirmed</div>
      ) : null}
      {effectiveCertainty === "projected" && mode === "projected" ? (
        <div className="certainty-badge certainty-badge--projected">~ Projected</div>
      ) : null}
      {effectiveCertainty === "projected" && mode === "projected" && visibleGhosts.length > 0 ? (
        <GhostTeamList ghosts={visibleGhosts} teamsById={teamsById} showFrequency={true} />
      ) : null}
    </div>
  );
}

function BracketCardReadonly({
  match,
  teamsById,
  mode
}: {
  match: BracketMatch;
  teamsById: Record<string, Team>;
  mode: "confirmed" | "projected";
}) {
  const home = match.homeTeamId ? teamsById[match.homeTeamId] : undefined;
  const away = match.awayTeamId ? teamsById[match.awayTeamId] : undefined;
  const info = knockoutSchedule[match.id];
  const liveMatches = useStore((s) => s.liveMatches);
  const kickoffUtc = info
    ? resolveKickoffByMatchId(match.id, info.date, Object.values(liveMatches))
    : undefined;

  return (
    <article className="bracket-card">
      <div className="bracket-card-head">
        <span className="match-date">{kickoffUtc ? formatKickoffLabel(kickoffUtc) : match.label}</span>
        <span className="match-city">{info?.hostCity ?? match.id}</span>
      </div>
      <BracketTeamReadonly
        team={home}
        seedLabel={match.homeSeedLabel}
        winner={match.winnerTeamId === home?.id}
        certainty={match.homeCertainty}
        ghosts={match.homeGhosts}
        mode={mode}
        teamsById={teamsById}
      />
      <BracketTeamReadonly
        team={away}
        seedLabel={match.awaySeedLabel}
        winner={match.winnerTeamId === away?.id}
        certainty={match.awayCertainty}
        ghosts={match.awayGhosts}
        mode={mode}
        teamsById={teamsById}
      />
      {match.homeScore !== undefined && match.awayScore !== undefined ? (
        <div className="bracket-scoreline">
          {match.homeScore} – {match.awayScore}
        </div>
      ) : null}
    </article>
  );
}

export function BracketBento() {
  const mode = useStore((s) => s.bracketViewMode);
  const teamsMap = useStore((s) => s.teams);
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useMemo(() => Object.values(teamsMap), [teamsMap]);
  const matches = useMemo(() => Object.values(liveMatchesMap), [liveMatchesMap]);
  const markets = useStore((s) => s.knockoutMarkets);
  const overrides = useStore((s) => s.scoreOverrides);

  const scored = useMemo(
    () =>
      matches.filter((m) => {
        if (m.homeScore === undefined || m.awayScore === undefined) return false;
        if (mode === "confirmed") return m.status === "completed";
        return true;
      }) as Parameters<typeof projectTournament>[1],
    [matches, mode]
  );

  const projection = teams.length
    ? projectTournament(teams, scored, markets, overrides)
    : null;

  const orderedByStage = useMemo(() => {
    const map: Record<Stage, BracketMatch[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      Final: []
    };
    for (const slot of projection?.bracket ?? []) {
      map[slot.stage].push(slot);
    }
    return map;
  }, [projection?.bracket]);

  return (
    <section className="bracket-section" aria-label="Knockout bracket">
      <div className="section-title">
        <div>
          <div className="section-kicker">Knockout</div>
          <h2>{mode === "confirmed" ? "Confirmed results" : "Projected bracket"}</h2>
        </div>
      </div>
      <p className="bracket-hint">
        {mode === "confirmed"
          ? "Only completed knockout ties with final scores. Switch to Projected for live standings-driven paths."
          : "Built from group standings and best-third cut line. Open Simulator to pick winners and run Monte Carlo paths."}
      </p>
      {!projection ? (
        <p className="view-note">Bracket loads after tournament data is available.</p>
      ) : (
        <div className="bracket-scroll">
          <div className="bracket-head">
            {bracketStages.map((stage) => (
              <h3 key={stage} style={{ gridColumn: stageColumns[stage] }}>
                {stage}
              </h3>
            ))}
          </div>
          <div className="bracket-rounds">
            {bracketStages.map((stage) => (
              <div className={`bracket-round ${stage === "Final" ? "is-final" : ""}`} key={stage}>
                {orderedByStage[stage].map((match) => (
                  <div className="bracket-cell" key={match.id}>
                    <BracketCardReadonly match={match} teamsById={teamsMap} mode={mode} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
