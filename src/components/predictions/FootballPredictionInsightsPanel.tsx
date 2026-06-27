import { useMemo } from "react";
import type { FootballPredictionPerformance } from "../../services/FootballPredictionClient";
import { APP_COPY } from "../../lib/appCopy";
import { resolvePredictionPick } from "../../lib/matchFootballPredictions";
import { useStore } from "../../store";

const copy = APP_COPY.odds;
const pred = APP_COPY.predictions;

function marketLabel(key: string): string {
  switch (key) {
    case "classic":
      return pred.marketClassic;
    case "ou25":
      return pred.marketOverUnder;
    case "both":
      return pred.marketBothScore;
    default:
      return key.toUpperCase();
  }
}

function PerformanceTable({
  title,
  bucket,
}: {
  title: string;
  bucket: Record<string, import("../../services/FootballPredictionClient").FootballPredictionPerformanceMarket>;
}) {
  const rows = Object.entries(bucket);
  if (rows.length === 0) return null;

  return (
    <div className="fp-performance-block">
      <h4>{title}</h4>
      <table className="fp-performance-table">
        <thead>
          <tr>
            <th>{pred.guessColumn}</th>
            <th>{copy.insightsWinRate}</th>
            <th>{copy.insightsProfit}</th>
            <th>{copy.insightsResultColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, row]) => (
            <tr key={key}>
              <td>{marketLabel(key)}</td>
              <td>{Math.round(row.winningPercentage)}%</td>
              <td className={row.profitLoss >= 0 ? "fp-pl-positive" : "fp-pl-negative"}>
                {row.profitLoss >= 0 ? "+" : ""}
                {row.profitLoss.toFixed(2)}
              </td>
              <td>
                {pred.winsLosses(row.countWon, row.countLost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FootballPredictionInsightsPanel() {
  const bundle = useStore((s) => s.footballPredictionBundle);
  const syncRunning = useStore((s) => s.footballPredictionSyncRunning);
  const indexSize = useMemo(() => {
    if (!bundle) return 0;
    return bundle.dailyPredictions.length;
  }, [bundle]);

  if (!bundle && syncRunning) {
    return (
      <section className="fp-insights-panel" aria-label={pred.ariaLabel}>
        <p className="fp-insights-loading">{pred.loading}</p>
      </section>
    );
  }

  if (!bundle) return null;

  const performance = bundle.performance as FootballPredictionPerformance | null;
  const wcMatches = bundle.dailyPredictions.filter(
    (p) =>
      /brazil|mexico|england|france|germany|spain|argentina|united states|portugal|netherlands|japan|korea|morocco|uruguay|colombia|ecuador|paraguay|panama|canada|australia|senegal|ghana|cameroon|tunisia|algeria|egypt|iran|saudi|qatar|scotland|switzerland|belgium|croatia|serbia|poland|austria|turkey|ukraine|norway|sweden|denmark|wales|haiti|jordan|iraq|uzbekistan|new zealand|south africa|ivory coast|congo|curacao|cape verde|bosnia|czech/i.test(
        `${p.homeTeam} ${p.awayTeam}`
      )
  );

  return (
    <section className="fp-insights-panel" aria-label={pred.ariaLabel}>
      <header className="fp-insights-header">
        <h3>{copy.insightsTitle}</h3>
        <p className="fp-insights-meta">{copy.insightsExplain}</p>
        <p className="fp-insights-meta">
          {indexSize} merged tips · {bundle.todayDaily.length} Today · {bundle.boggioDaily.length}{" "}
          Boggio · updated {new Date(bundle.fetchedAt).toLocaleDateString()}
        </p>
      </header>

      {performance ? (
        <div className="fp-performance-grid">
          <PerformanceTable title={pred.featuredPerformance} bucket={performance.featured} />
          <PerformanceTable title={pred.allPerformance} bucket={performance.all} />
        </div>
      ) : null}

      {wcMatches.length > 0 ? (
        <div className="fp-wc-picks">
          <h4>{pred.wcTeamsToday}</h4>
          <ul className="fp-picks-list">
            {wcMatches.slice(0, 8).map((p) => {
              const resolved = resolvePredictionPick(p.prediction, p.homeTeam, p.awayTeam);
              const confidence =
                p.predictionProbability != null ? pred.confidence(p.predictionProbability) : "";
              return (
                <li key={p.id} className="fp-pick-row">
                  <span className="fp-pick-teams">
                    {p.homeTeam} vs {p.awayTeam}
                  </span>
                  <span className="fp-pick-call">
                    {pred.tipPrefix} <strong>{resolved.shortLabel}</strong>
                    {confidence}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="fp-insights-note">
          {pred.noWcTips(bundle.leagues.length)}
        </p>
      )}

      {bundle.vipFeatured.length > 0 ? (
        <div className="fp-vip-block">
          <h4>{pred.extraFeatured}</h4>
          <ul className="fp-picks-list">
            {bundle.vipFeatured.slice(0, 5).map((p) => {
              const resolved = resolvePredictionPick(p.prediction, p.homeTeam, p.awayTeam);
              return (
                <li key={p.id} className="fp-pick-row">
                  {p.homeTeam} vs {p.awayTeam} — <strong>{resolved.shortLabel}</strong>
                </li>
              );
            })}
          </ul>
        </div>
      ) : bundle.unavailable.includes("predictions/featured") ? (
        <p className="fp-insights-note fp-insights-note--muted">
          {pred.paidPlanNote}
        </p>
      ) : null}

      <p className="fp-disclaimer">{copy.disclaimer}</p>
    </section>
  );
}
