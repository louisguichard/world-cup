import { buildLiveKnockoutContextBracket } from "./buildLiveKnockoutContextBracket";
import { buildConfirmedOnlyBracket } from "./buildConfirmedOnlyBracket";
import { projectTournament } from "../tournament";
import type {
  BracketMatch,
  BracketViewMode,
  GroupStanding,
  Match,
  MergedMatch,
  PolymarketMatchMarket,
  ScoreOverride,
  Team,
} from "../../types";
import type { QualificationMatchContext } from "../qualification";

export type BracketViewModel = {
  bracket: BracketMatch[];
  standings: GroupStanding[];
  fingerprint: string;
};

export type BuildBracketViewModelInput = {
  mode: BracketViewMode;
  context?: "tab" | "live";
  teams: Team[];
  matches: Match[];
  liveMatches: Record<string, MergedMatch>;
  qualContext: QualificationMatchContext;
  mergedSchedule?: MergedMatch[];
  knockoutMarkets?: PolymarketMatchMarket[];
  scoreOverrides?: Record<string, ScoreOverride>;
};

function projectionMatchesFrom(
  matches: Match[],
  mode: BracketViewMode,
  context: "tab" | "live"
): Parameters<typeof projectTournament>[1] {
  return matches.filter((m) => {
    if (m.group) return true;
    if (context === "live") {
      return m.homeScore !== undefined && m.awayScore !== undefined;
    }
    if (mode === "confirmed") {
      return (
        m.homeScore !== undefined &&
        m.awayScore !== undefined &&
        ((m.status === "completed" && m.locked) || m.status === "live")
      );
    }
    return m.homeScore !== undefined && m.awayScore !== undefined;
  }) as Parameters<typeof projectTournament>[1];
}

function buildFingerprint(input: BuildBracketViewModelInput): string {
  const liveKeys = Object.keys(input.liveMatches).sort();
  const liveDigest = liveKeys
    .map((key) => {
      const m = input.liveMatches[key]!;
      return `${key}:${m.status}:${m.locked}:${m.homeScore}:${m.awayScore}`;
    })
    .join("|");
  return `${input.mode}:${input.context ?? "tab"}:${input.teams.length}:${input.matches.length}:${liveDigest}`;
}

/**
 * Single bracket data entry point for UI — confirmed official path vs full projection.
 */
export function buildBracketViewModel(input: BuildBracketViewModelInput): BracketViewModel {
  const context = input.context ?? "tab";
  const fingerprint = buildFingerprint(input);

  if (input.mode === "confirmed") {
    const result =
      context === "live"
        ? buildLiveKnockoutContextBracket(
            input.teams,
            input.matches,
            input.liveMatches,
            input.qualContext
          )
        : buildConfirmedOnlyBracket(
            input.teams,
            input.matches,
            input.liveMatches,
            input.qualContext
          );

    return { ...result, fingerprint };
  }

  const projectionInputs = projectionMatchesFrom(input.matches, input.mode, context);
  const result = projectTournament(
    input.teams,
    projectionInputs,
    input.knockoutMarkets ?? [],
    input.scoreOverrides ?? {},
    {},
    input.qualContext.lockedGroupMatchCount,
    input.qualContext.lockedStandingsByGroup,
    input.mergedSchedule
  );

  return {
    bracket: result.bracket,
    standings: result.standings,
    fingerprint,
  };
}
