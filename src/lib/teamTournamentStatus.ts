import { resolveCanonicalTeamId } from "../data/wc2026TeamCatalog";
import type { GroupStanding, MatchEvent, MergedMatch, Stage, Team } from "../types";
import { APP_COPY } from "./appCopy";
import { derivePenaltyShootout, isKnockoutPenaltyDecided } from "./derivePenaltyShootout";
import { getKnockoutStageLabel, resolveScheduleStage } from "./resultsGrouping";
import { resolveEventsForMatch } from "./resolveMatchEvents";
import { isKnockoutMatch, resolveMatchWinner } from "./resolveMatchWinner";

const SCHEDULE_TO_STAGE: Record<string, Stage> = {
  round_of_32: "R32",
  round_of_16: "R16",
  quarterfinal: "QF",
  semifinal: "SF",
  final: "Final",
};

const STAGE_COPY: Record<Stage, string> = {
  R32: APP_COPY.results.stageR32,
  R16: APP_COPY.results.stageR16,
  QF: APP_COPY.results.stageQF,
  SF: APP_COPY.results.stageSF,
  Final: APP_COPY.results.stageFinal,
};

const NEXT_STAGE: Partial<Record<Stage, { stage: Stage; label: string }>> = {
  R32: { stage: "R16", label: `Advanced to ${APP_COPY.results.stageR16}` },
  R16: { stage: "QF", label: `Advanced to ${APP_COPY.results.stageQF}` },
  QF: { stage: "SF", label: `Advanced to ${APP_COPY.results.stageSF}` },
  SF: { stage: "Final", label: `Advanced to ${APP_COPY.results.stageFinal}` },
};

export type TeamTournamentStatus =
  | {
      phase: "group";
      groupQualified: boolean;
      groupRank?: number;
      groupLetter?: string;
      label: string;
      hint: string;
    }
  | {
      phase: "in_knockout";
      stage: Stage;
      label: string;
      hint: string;
    }
  | {
      phase: "eliminated";
      stage: Stage;
      label: string;
      hint: string;
      matchId: string;
      opponentId: string;
      ftHome: number;
      ftAway: number;
      viaPenalties: boolean;
      penHome?: number;
      penAway?: number;
      teamWasHome: boolean;
    };

export type BuildTeamTournamentStatusInput = {
  teamId: string;
  team?: Team;
  matches: MergedMatch[];
  teams: Record<string, Team>;
  matchEvents: Record<string, MatchEvent[]>;
  standings: GroupStanding[];
};

function resolveMatchStage(match: MergedMatch): Stage | undefined {
  if (match.stage) return match.stage;
  const scheduleStage = resolveScheduleStage(match);
  return SCHEDULE_TO_STAGE[scheduleStage];
}

function resolveShootout(
  match: MergedMatch,
  matchEvents: Record<string, MatchEvent[]>,
  teams: Record<string, Team>
) {
  const events = resolveEventsForMatch(match, matchEvents, teams);
  return derivePenaltyShootout({
    events,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    period: match.period,
    decidedByPenalties: match.decidedByPenalties,
    existing: match.penaltyShootout,
  });
}

function teamKnockoutMatches(
  teamId: string,
  matches: MergedMatch[],
  teams: Record<string, Team>
): MergedMatch[] {
  const canon = resolveCanonicalTeamId(teamId, teams[teamId]);
  return matches
    .filter((m) => m.status === "completed" && isKnockoutMatch(m))
    .filter((m) => {
      const home = resolveCanonicalTeamId(m.homeTeamId, teams[m.homeTeamId]);
      const away = resolveCanonicalTeamId(m.awayTeamId, teams[m.awayTeamId]);
      return home === canon || away === canon;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function groupStandingForTeam(
  teamId: string,
  standings: GroupStanding[]
): { rank: number; group: string; qualified: boolean } | null {
  const canon = teamId;
  for (const group of standings) {
    const idx = group.rows.findIndex((r) => r.teamId === teamId);
    if (idx >= 0) {
      const rank = idx + 1;
      return { rank, group: group.group, qualified: rank <= 2 };
    }
  }
  return null;
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function buildGroupStatus(
  team: Team | undefined,
  standing: { rank: number; group: string; qualified: boolean } | null
): TeamTournamentStatus {
  if (standing?.qualified) {
    const label = `Finished ${ordinal(standing.rank)} in Group ${standing.group} — advanced to ${APP_COPY.results.stageR32}`;
    return {
      phase: "group",
      groupQualified: true,
      groupRank: standing.rank,
      groupLetter: standing.group,
      label,
      hint: "Qualified from the group stage into the Round of 32.",
    };
  }

  if (standing) {
    return {
      phase: "group",
      groupQualified: false,
      groupRank: standing.rank,
      groupLetter: standing.group,
      label: `Finished ${ordinal(standing.rank)} in Group ${standing.group}`,
      hint: "Group stage complete — did not finish in the top two.",
    };
  }

  return {
    phase: "group",
    groupQualified: false,
    label: team ? `${team.name} — group stage` : "Group stage",
    hint: "Still in or awaiting group-stage results.",
  };
}

/** Knockout-aware tournament status for team drawer and badges. */
export function buildTeamTournamentStatus(input: BuildTeamTournamentStatusInput): TeamTournamentStatus {
  const { teamId, team, matches, teams, matchEvents, standings } = input;
  const canon = resolveCanonicalTeamId(teamId, teams[teamId]);
  const knockout = teamKnockoutMatches(teamId, matches, teams);
  const standing = groupStandingForTeam(canon, standings);

  for (let i = knockout.length - 1; i >= 0; i -= 1) {
    const match = knockout[i]!;
    const shootout = resolveShootout(match, matchEvents, teams);
    const winner = resolveMatchWinner(match, teams, shootout);
    const teamCanon = canon;
    const homeCanon = resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
    const isHome = homeCanon === teamCanon;

    if (winner && winner !== teamCanon) {
      const stage = resolveMatchStage(match) ?? "R32";
      const stageLabel = getKnockoutStageLabel(match) ?? APP_COPY.results.stageR32;
      const viaPenalties = isKnockoutPenaltyDecided(match, shootout);
      const opponentId = isHome ? match.awayTeamId : match.homeTeamId;

      return {
        phase: "eliminated",
        stage,
        label: `Eliminated in ${stageLabel}`,
        hint: `Did not advance past ${stageLabel}.`,
        matchId: match.id,
        opponentId,
        ftHome: match.homeScore ?? 0,
        ftAway: match.awayScore ?? 0,
        viaPenalties,
        penHome: shootout?.homeScore,
        penAway: shootout?.awayScore,
        teamWasHome: isHome,
      };
    }
  }

  if (knockout.length > 0) {
    const lastWin = knockout[knockout.length - 1]!;
    const stage = resolveMatchStage(lastWin) ?? "R32";
    const next = NEXT_STAGE[stage];
    if (next) {
      return {
        phase: "in_knockout",
        stage: next.stage,
        label: next.label,
        hint: `Still alive — next up is ${STAGE_COPY[next.stage]}.`,
      };
    }
    const stageLabel = getKnockoutStageLabel(lastWin) ?? "Knockout";
    return {
      phase: "in_knockout",
      stage,
      label: `Won ${stageLabel}`,
      hint: "Still in the tournament.",
    };
  }

  return buildGroupStatus(team, standing);
}

export function advancementSectionCopy(status: TeamTournamentStatus): {
  title: string;
  label: string;
  hint: string;
} {
  const title = APP_COPY.knockoutStory.advancementTitle;
  if (status.phase === "eliminated") {
    const stageLabel =
      status.stage === "R32"
        ? APP_COPY.results.stageR32
        : status.stage === "R16"
          ? APP_COPY.results.stageR16
          : status.stage === "QF"
            ? APP_COPY.results.stageQF
            : status.stage === "SF"
              ? APP_COPY.results.stageSF
              : APP_COPY.results.stageFinal;
    return {
      title,
      label: `Did not advance past ${stageLabel}`,
      hint: status.hint,
    };
  }
  return { title, label: status.label, hint: status.hint };
}
