import { useMemo } from "react";
import type { FootballPredictionPerformance } from "../../services/FootballPredictionClient";
import { useStore } from "../../store";

function marketLabel(key: string): string {
  switch (key) {
    case "classic":
      return "1X2";
    case "ou25":
      return "Over/Under 2.5";
    case "both":
      return "Both teams score";
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
            <th>Market</th>
            <th>Win %</th>
            <th>P/L</th>
            <th>Record</th>
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
                {row.countWon}W–{row.countLost}L
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
      <section className="fp-insights-panel" aria-label="Football predictions">
        <p className="fp-insights-loading">Loading daily predictions…</p>
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
    <section className="fp-insights-panel" aria-label="Football predictions">
      <header className="fp-insights-header">
        <h3>Today Football Prediction</h3>
        <p className="fp-insights-meta">
          {indexSize} picks cached · updated {new Date(bundle.fetchedAt).toLocaleDateString()}
        </p>
      </header>

      {performance ? (
        <div className="fp-performance-grid">
          <PerformanceTable title="Featured picks performance" bucket={performance.featured} />
          <PerformanceTable title="All picks performance" bucket={performance.all} />
        </div>
      ) : null}

      {wcMatches.length > 0 ? (
        <div className="fp-wc-picks">
          <h4>World Cup nation matches today</h4>
          <ul className="fp-picks-list">
            {wcMatches.slice(0, 8).map((p) => (
              <li key={p.id} className="fp-pick-row">
                <span className="fp-pick-teams">
                  {p.homeTeam} vs {p.awayTeam}
                </span>
                <span className="fp-pick-call">
                  Pick <strong>{p.prediction}</strong>
                  {p.predictionProbability != null ? ` (${p.predictionProbability}%)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="fp-insights-note">
          No World Cup nation picks in today&apos;s feed yet — {bundle.leagues.length} leagues tracked.
          WC fixtures will show picks here when the API lists them.
        </p>
      )}

      {bundle.vipFeatured.length > 0 ? (
        <div className="fp-vip-block">
          <h4>VIP featured</h4>
          <ul className="fp-picks-list">
            {bundle.vipFeatured.slice(0, 5).map((p) => (
              <li key={p.id} className="fp-pick-row">
                {p.homeTeam} vs {p.awayTeam} — <strong>{p.prediction}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : bundle.unavailable.includes("predictions/featured") ? (
        <p className="fp-insights-note fp-insights-note--muted">
          VIP featured picks require a PRO plan on this API.
        </p>
      ) : null}

      <p className="fp-disclaimer">Third-party predictions for entertainment only — not financial advice.</p>
    </section>
  );
}
