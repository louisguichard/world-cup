import type { FootballPredictionMatch } from "../../services/FootballPredictionClient";
import { formatPredictionPick } from "../../lib/matchFootballPredictions";

type Props = {
  prediction: FootballPredictionMatch;
  compact?: boolean;
};

export function PredictionBadge({ prediction, compact }: Props) {
  const prob =
    prediction.predictionProbability != null ? `${prediction.predictionProbability}%` : null;
  const odd = prediction.predictionOdd != null ? `@ ${prediction.predictionOdd.toFixed(2)}` : null;

  return (
    <div
      className={`fp-match-badge ${compact ? "fp-match-badge--compact" : ""}`.trim()}
      aria-label={`Prediction: ${formatPredictionPick(prediction.prediction)}`}
    >
      <span className="fp-match-badge-label">Tip</span>
      <strong>{prediction.prediction}</strong>
      <span className="fp-match-badge-meta">
        {formatPredictionPick(prediction.prediction)}
        {prob ? ` · ${prob}` : ""}
        {odd ? ` · ${odd}` : ""}
      </span>
    </div>
  );
}
