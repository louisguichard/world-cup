import { APP_COPY } from "../../lib/appCopy";
import { explainTitleOddsPercent } from "../../lib/oddsDisplay";
import { resolvePredictionPick } from "../../lib/matchFootballPredictions";
import type { FootballPredictionMatch } from "../../services/FootballPredictionClient";
import type { Team } from "../../types";

type Props = {
  team: Team;
  teamPredictions: FootballPredictionMatch[];
  simulationRunning: boolean;
};

const copy = APP_COPY.odds;

export function TeamBettingPanel({ team, teamPredictions, simulationRunning }: Props) {
  const titlePct = team.titleProbability != null ? team.titleProbability * 100 : null;

  return (
    <div className="team-betting-panel">
      <section className="team-betting-block">
        <h3 className="team-sheet-section-title">{copy.titleMarketTitle}</h3>
        <p className="team-betting-lead">{copy.titleMarketExplain}</p>
        {titlePct != null && titlePct > 0 ? (
          <>
            <p className="team-betting-title-pct">
              <strong>{team.name}</strong>: {titlePct.toFixed(1)}%
            </p>
            <p className="team-betting-explain">{explainTitleOddsPercent(titlePct)}</p>
          </>
        ) : (
          <p className="team-sheet-empty">{copy.noTitleOdds}</p>
        )}
      </section>

      <section className="team-betting-block">
        <h3 className="team-sheet-section-title">{copy.matchPicksTitle}</h3>
        <p className="team-betting-lead">{copy.matchPicksExplain}</p>
        {teamPredictions.length > 0 ? (
          <ul className="fp-picks-list team-betting-picks">
            {teamPredictions.slice(0, 8).map((p) => {
              const resolved = resolvePredictionPick(p.prediction, p.homeTeam, p.awayTeam);
              const confidence =
                p.predictionProbability != null ? ` · about ${p.predictionProbability}% sure` : "";
              return (
                <li key={p.id} className="fp-pick-row team-betting-pick-row">
                  <div className="team-betting-pick-match">
                    <strong>
                      {p.homeTeam} vs {p.awayTeam}
                    </strong>
                    <span className="team-betting-pick-call">
                      {resolved.shortLabel}
                      {confidence}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="team-sheet-empty">{copy.noMatchPicks}</p>
        )}
      </section>

      <details className="odds-glossary team-betting-glossary">
        <summary>{copy.whatNumbersMeanTitle}</summary>
        <p>{copy.americanOddsExplain}</p>
        <p>{copy.favoriteExplain}</p>
        <p>{copy.titleMarketExplain}</p>
      </details>

      <p className="team-betting-simulator-note">{copy.simulatorNote}</p>
      {simulationRunning ? <p className="odds-recalc">Updating win chances…</p> : null}
      <p className="odds-disclaimer">{copy.disclaimer}</p>
    </div>
  );
}
