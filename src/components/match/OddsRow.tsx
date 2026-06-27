import { useMemo } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useMatchOdds } from "../../hooks/useMatchOdds";
import {
  buildMatchOddsSummary,
  explainAmericanOdds,
  formatAmericanOdds,
} from "../../lib/oddsDisplay";
import type { MergedMatch, OddsSnapshot } from "../../types";

type Props = {
  match: MergedMatch;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
  /** When set, skips internal odds fetch (used by FixtureBettingSection). */
  externalOdds?: OddsSnapshot | null;
  externalLoading?: boolean;
};

const POLYMARKET_EVENT_BASE = "https://polymarket.com/event";
const copy = APP_COPY.odds;

export function OddsRow({
  match,
  homeTeam,
  awayTeam,
  compact,
  externalOdds,
  externalLoading,
}: Props) {
  const hooked = useMatchOdds(externalOdds !== undefined ? null : match, homeTeam, awayTeam);
  const odds = externalOdds !== undefined ? externalOdds : hooked.odds;
  const loading = externalLoading !== undefined ? externalLoading : hooked.loading;

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

  if (loading) {
    return (
      <div className={`odds-panel odds-panel--loading ${compact ? "odds-panel--compact" : ""}`.trim()}>
        <span className="odds-panel-title">{compact ? copy.panelTitleCompact : copy.panelTitle}</span>
        <span className="odds-loading">Loading prices…</span>
      </div>
    );
  }

  if (!odds || !summary) return null;

  const marketUrl =
    odds.source === "polymarket" && odds.marketSlug
      ? `${POLYMARKET_EVENT_BASE}/${odds.marketSlug}`
      : undefined;

  const sourceName =
    odds.source === "polymarket" ? "Polymarket" : odds.source === "sportsbook" ? "Sportsbook" : "Market";

  return (
    <section
      className={`odds-panel ${compact ? "odds-panel--compact" : ""}`.trim()}
      aria-label={`${sourceName} win odds for ${homeTeam} vs ${awayTeam}`}
    >
      <header className="odds-panel-header">
        <h4 className="odds-panel-title">{compact ? copy.panelTitleCompact : copy.panelTitle}</h4>
        {marketUrl ? (
          <a href={marketUrl} target="_blank" rel="noopener noreferrer" className="odds-source-link">
            {sourceName}
          </a>
        ) : (
          <span className="odds-source-name">{sourceName}</span>
        )}
      </header>

      <ul className="odds-outcome-list">
        {summary.rows.map((row) => (
          <li
            key={row.side}
            className={`odds-outcome-row ${row.isFavorite ? "odds-outcome-row--favorite" : ""}`.trim()}
          >
            <div className="odds-outcome-main">
              <span className="odds-outcome-team">{row.teamLabel}</span>
              {row.isFavorite ? (
                <span className="odds-favorite-badge">{copy.favoriteBadge}</span>
              ) : null}
            </div>
            <div className="odds-outcome-stats">
              <strong className="odds-outcome-price" title={explainAmericanOdds(row.american)}>
                {formatAmericanOdds(row.american)}
              </strong>
              {row.impliedPercent > 0 ? (
                <span className="odds-outcome-chance">{copy.impliedChance(Math.round(row.impliedPercent))}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!compact ? (
        <>
          {summary.favoriteExplain ? <p className="odds-explain odds-explain--lead">{summary.favoriteExplain}</p> : null}
          <p className="odds-explain">{summary.sourceExplain}</p>
          <details className="odds-glossary">
            <summary>{copy.whatNumbersMeanTitle}</summary>
            <p>{copy.americanOddsExplain}</p>
            <p>{copy.favoriteExplain}</p>
          </details>
        </>
      ) : summary.favoriteExplain ? (
        <p className="odds-explain odds-explain--compact">{summary.favoriteExplain}</p>
      ) : null}

      {!compact ? <p className="odds-disclaimer">{copy.disclaimer}</p> : null}
    </section>
  );
}
