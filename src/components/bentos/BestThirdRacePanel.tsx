import { useMemo } from "react";
import { buildQualificationContext, computeQualificationStatus } from "../../lib/qualification";
import { rankAliveBestThirds } from "../../lib/bestThirds";
import { getThirdPlaceBubbleState } from "../../lib/thirdPlaceLiveStatus";
import { formatLiveClock } from "../../lib/formatMatchClock";
import { resolveQualificationDisplay } from "../../lib/qualificationDisplay";
import type { GroupStanding, MergedMatch, TeamRecord } from "../../types";
import { teamDisplayNameFromId, teamDisplayNameForMatch } from "../../lib/matchTeamDisplay";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { TeamFlag } from "../team/TeamFlag";
import { StandingThemeRow } from "../team/StandingThemeRow";

function statusLabel(
  rank: number,
  teamId: string,
  standings: GroupStanding[],
  qualContext: ReturnType<typeof buildQualificationContext>
): { text: string; className: string } {
  const race = APP_COPY.bestThirdRace;

  if (rank <= 8) {
    return {
      text: rank === 8 ? race.statusCutLine : race.statusMovingOn,
      className: rank === 8 ? "best-third-status--cut" : "best-third-status--in",
    };
  }

  const qual = computeQualificationStatus(teamId, standings, qualContext);
  const display = resolveQualificationDisplay(qual);
  if (display.variant === "confirmed-eliminated") {
    return { text: race.statusOut, className: "best-third-status--out" };
  }
  if (display.variant === "projected-eliminated") {
    return { text: race.statusLikelyOut, className: "best-third-status--warn" };
  }
  return { text: race.statusStillIn, className: "best-third-status--warn" };
}

export function BestThirdRacePanel() {
  const standings = useStore((s) => s.groupStandings);
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);

  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const ranked = useMemo(() => rankAliveBestThirds(standings, qualContext), [standings, qualContext]);
  const thirdIds = useMemo(() => new Set(ranked.map((r) => r.teamId)), [ranked]);

  const liveCallouts = useMemo(() => {
    const live = Object.values(liveMatches).filter((m) => m.status === "live" && m.group);
    const callouts: { type: "live" | "watch"; match: MergedMatch; label: string }[] = [];

    for (const match of live) {
      const involvesThird =
        thirdIds.has(match.homeTeamId) || thirdIds.has(match.awayTeamId);
      const homeRank = ranked.findIndex((r) => r.teamId === match.homeTeamId);
      const awayRank = ranked.findIndex((r) => r.teamId === match.awayTeamId);
      const nearCut =
        (homeRank >= 5 && homeRank <= 10) || (awayRank >= 5 && awayRank <= 10);

      const home = teamDisplayNameFromId(match.homeTeamId, teams);
      const away = teamDisplayNameFromId(match.awayTeamId, teams);
      const score = `${match.homeScore ?? 0}–${match.awayScore ?? 0}`;
      const clock = formatLiveClock(match);

      if (involvesThird) {
        callouts.push({
          type: "live",
          match,
          label: `Group ${match.group} — ${home} vs ${away}  ${score}  ${clock}`
        });
      } else if (nearCut) {
        callouts.push({
          type: "watch",
          match,
          label: `${home} vs ${away}  ${score}  ${clock}`
        });
      }
      if (callouts.length >= 3) break;
    }

    return callouts;
  }, [liveMatches, ranked, thirdIds, teams]);

  const bt = APP_COPY.bestThird;
  const tbl = APP_COPY.table;
  const race = APP_COPY.bestThirdRace;

  if (ranked.length === 0) return null;

  return (
    <section className="best-third-race-panel dashboard-section" aria-label={bt.raceTitle}>
      <header className="best-third-race-head">
        <div>
          <h2 className="section-title-text">{bt.raceTitle}</h2>
          <p className="best-third-race-lead">{bt.raceLead}</p>
        </div>
        <span className="best-third-race-live-dot" aria-hidden>
          {bt.liveBadge} ●
        </span>
      </header>

      <div className="group-table-scroll">
        <table className="group-table best-third-race-table">
          <thead>
            <tr>
              <th>{tbl.rank}</th>
              <th>{tbl.team}</th>
              <th>{tbl.points}</th>
              <th>{tbl.goalDiff}</th>
              <th>{tbl.goalsFor}</th>
              <th>{tbl.group}</th>
              <th>{tbl.status}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row: TeamRecord, index) => {
              const team = teams[row.teamId];
              const status = statusLabel(index + 1, row.teamId, standings, qualContext);
              const isCutLine = index === 7;
              const dimmed = index >= 8;
              const bubbleState = getThirdPlaceBubbleState(
                row.teamId,
                index + 1,
                ranked,
                standings,
                qualContext
              );
              return (
                <StandingThemeRow
                  key={row.teamId}
                  teamId={row.teamId}
                  accentAnimated={bubbleState === "bubble"}
                  className={`${isCutLine ? "best-third-race-cut" : ""} ${dimmed ? "best-third-race-dim" : ""}`}
                >
                  <td>{index + 1}</td>
                  <td className="group-table-team">
                    <TeamFlag team={team} teamId={row.teamId} />
                    <span className="team-name-text qual-team-name">{teamDisplayNameFromId(row.teamId, teams)}</span>
                  </td>
                  <td>
                    <strong>{row.points}</strong>
                  </td>
                  <td>
                    {row.goalDifference >= 0 ? "+" : ""}
                    {row.goalDifference}
                  </td>
                  <td>{row.goalsFor}</td>
                  <td>{row.group}</td>
                  <td>
                    <span className={`best-third-status ${status.className}`}>{status.text}</span>
                  </td>
                </StandingThemeRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {liveCallouts.length > 0 ? (
        <div className="best-third-race-callouts">
          {liveCallouts.map((c) => (
            <p key={c.match.id} className={`best-third-race-callout best-third-race-callout--${c.type}`}>
              {c.type === "live" ? `🔴 ${race.liveCallout}: ` : `👁 ${race.watchCallout}: `}
              {c.label}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
