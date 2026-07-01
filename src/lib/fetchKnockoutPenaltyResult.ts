import { isApiEnabled } from "../config/apiFlags";
import { isZafronixDisabled, fetchMatchResult } from "../services/ZafronixClient";
import type { MergedMatch, PenaltyShootout } from "../types";
import { resolveBracketMatchId } from "./bracketTree";
import { penaltyShootoutFromAggregate } from "./derivePenaltyShootout";
import { isKnockoutMatch } from "./resolveMatchWinner";

/** Fetch penalty totals from Zafronix for a completed knockout tie. */
export async function fetchZafronixPenaltyShootout(
  matchId: string
): Promise<PenaltyShootout | undefined> {
  if (!isApiEnabled("zafronix") || isZafronixDisabled()) return undefined;

  const result = await fetchMatchResult(matchId);
  const penalties = result?.penalties;
  if (!penalties || (penalties.home <= 0 && penalties.away <= 0)) return undefined;

  return penaltyShootoutFromAggregate(penalties);
}

export function needsZafronixPenaltyFetch(match: MergedMatch): boolean {
  if (match.penaltyShootout) return false;
  if (match.status !== "completed") return false;
  if (!isKnockoutMatch(match)) return false;

  const matchId = match.matchId ?? resolveBracketMatchId(match);
  if (!matchId) return false;

  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  return home === away || match.decidedByPenalties === true || match.period === "penalties";
}

/** Backfill penalty shootout totals for completed knockout ties missing data. */
export async function enrichKnockoutPenaltiesFromZafronix(
  matches: Record<string, MergedMatch>
): Promise<Record<string, MergedMatch>> {
  const out = { ...matches };
  const candidates = Object.entries(out).filter(([, m]) => needsZafronixPenaltyFetch(m));

  await Promise.allSettled(
    candidates.map(async ([key, match]) => {
      const matchId = match.matchId ?? resolveBracketMatchId(match);
      if (!matchId) return;

      const shootout = await fetchZafronixPenaltyShootout(matchId);
      if (!shootout) return;

      out[key] = {
        ...match,
        penaltyShootout: shootout,
        decidedByPenalties: true,
      };
    })
  );

  return out;
}
