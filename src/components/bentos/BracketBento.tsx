import { useMemo } from "react";
import { knockoutSchedule } from "../../data/knockoutSchedule";
import { projectTournament } from "../../lib/tournament";
import { formatKickoffLabel, resolveKickoffByMatchId } from "../../services/ScheduleLinker";
import type { BracketMatch, Stage, Team } from "../../types";
import { useStore } from "../../store";
import { useTeamTheme } from "../../hooks/useTeamTheme";
import type { TeamThemeStatus } from "../team/TeamThemeRoot";

const bracketStages: Stage[] = ["R32", "R16", "QF", "SF", "Final"];
const stageColumns: Record<Stage, number> = { R32: 1, R16: 2, QF: 3, SF: 4, Final: 5 };

function BracketTeamReadonly({
  team,
  seedLabel,
  winner,
  status = "default"
}: {
  team?: Team;
  seedLabel?: string;
  winner?: boolean;
  status?: TeamThemeStatus;
}) {
  const theme = useTeamTheme(team?.id);
  const resolvedStatus: TeamThemeStatus = winner ? "advancing" : status;

  return (
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
  );
}

function BracketCardReadonly({ match, teamsById }: { match: BracketMatch; teamsById: Record<string, Team> }) {
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
      />
      <BracketTeamReadonly
        team={away}
        seedLabel={match.awaySeedLabel}
        winner={match.winnerTeamId === away?.id}
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
                    <BracketCardReadonly match={match} teamsById={teamsMap} />
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
