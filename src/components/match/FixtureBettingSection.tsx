import { useMemo, type MouseEvent, type SyntheticEvent } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useMatchOdds } from "../../hooks/useMatchOdds";
import { buildMatchOddsSummary } from "../../lib/oddsDisplay";
import { resolvePredictionPick } from "../../lib/matchFootballPredictions";
import { useFootballPredictionForMatch } from "../../hooks/useFootballPredictionIndex";
import { OddsRow } from "./OddsRow";
import { PredictionBadge } from "../predictions/PredictionBadge";
import type { MergedMatch } from "../../types";

type Props = {
  match: MergedMatch;
  homeTeam: string;
  awayTeam: string;
};

const copy = APP_COPY.odds;

function stopCardClick(event: MouseEvent | SyntheticEvent) {
  event.stopPropagation();
}

export function FixtureBettingSection({ match, homeTeam, awayTeam }: Props) {
  const prediction = useFootballPredictionForMatch(match);
  const { odds, loading } = useMatchOdds(match, homeTeam, awayTeam);

  const summary = useMemo(() => {
    if (!odds) return null;
    return buildMatchOddsSummary(odds, homeTeam, awayTeam, {
      drawLabel: copy.drawLabel,
      toAdvanceLabel: copy.toAdvanceLabel,
      favoriteLead: copy.favoriteLead,
      drawFavoriteLead: copy.drawFavoriteLead,
      sourcePolymarket: copy.sourcePolymarket,
      sourceSportsbook: copy.sourceSportsbook,
      sourceGeneric: copy.sourceGeneric,
    });
  }, [odds, homeTeam, awayTeam]);

  const summaryMeta = useMemo(() => {
    if (loading) return copy.fixtureBettingLoading;

    const parts: string[] = [];

    if (summary) {
      if (summary.favoriteSide === "draw") {
        const drawRow = summary.rows.find((r) => r.side === "draw");
        if (drawRow) {
          parts.push(`Tie favorite (${Math.round(drawRow.impliedPercent)}%)`);
        }
      } else if (summary.favoriteTeam) {
        const favRow = summary.rows.find((r) => r.isFavorite);
        if (favRow) {
          parts.push(copy.fixtureSummaryFavorite(summary.favoriteTeam, Math.round(favRow.impliedPercent)));
        }
      }
    }

    if (prediction) {
      const resolved = resolvePredictionPick(prediction.prediction, homeTeam, awayTeam);
      parts.push(copy.fixtureSummaryTip(resolved.shortLabel));
    }

    if (parts.length === 0) return copy.fixtureBettingExpand;
    return parts.join(" · ");
  }, [loading, summary, prediction, homeTeam, awayTeam]);

  if (!loading && !odds && !prediction) return null;

  return (
    <details className="fixture-betting-details" onClick={stopCardClick}>
      <summary className="fixture-betting-summary" onClick={stopCardClick}>
        <span className="fixture-betting-summary-label">{copy.fixtureBettingTitle}</span>
        <span className="fixture-betting-summary-meta">{summaryMeta}</span>
      </summary>
      <div className="fixture-betting-body">
        {prediction ? (
          <PredictionBadge
            prediction={prediction}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            compact={false}
          />
        ) : null}
        <OddsRow
          match={match}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          compact={false}
          externalOdds={odds}
          externalLoading={loading}
        />
      </div>
    </details>
  );
}
