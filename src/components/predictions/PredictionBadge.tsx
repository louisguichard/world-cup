import { APP_COPY } from "../../lib/appCopy";
import { resolvePredictionPick } from "../../lib/matchFootballPredictions";
import type { FootballPredictionMatch } from "../../services/FootballPredictionClient";

type Props = {
  prediction: FootballPredictionMatch;
  homeTeam: string;
  awayTeam: string;
  compact?: boolean;
};

const copy = APP_COPY.odds;

function pickExplain(side: ReturnType<typeof resolvePredictionPick>["side"], home: string, away: string): string {
  switch (side) {
    case "home":
      return copy.pickExplainHome(home, away);
    case "away":
      return copy.pickExplainAway(away, home);
    case "draw":
      return copy.pickExplainDraw(home, away);
    default:
      return "";
  }
}

export function PredictionBadge({ prediction, homeTeam, awayTeam, compact }: Props) {
  const resolved = resolvePredictionPick(prediction.prediction, homeTeam, awayTeam);
  const prob =
    prediction.predictionProbability != null ? `${prediction.predictionProbability}% sure` : null;
  const explain = pickExplain(resolved.side, homeTeam, awayTeam);
  const consensus =
    prediction.source === "merged" || (prediction.sources?.length ?? 0) > 1
      ? "Both tipsters agree"
      : prediction.vipTier === "featured"
        ? "Featured pick"
        : prediction.vipTier === "scores"
          ? "Score pick"
          : null;

  return (
    <div
      className={`fp-match-badge ${compact ? "fp-match-badge--compact" : ""}`.trim()}
      aria-label={`Tip: ${resolved.shortLabel}`}
    >
      <span className="fp-match-badge-label">Tip</span>
      <strong className="fp-match-badge-pick">{resolved.shortLabel}</strong>
      {consensus ? <span className="fp-match-badge-confidence">{consensus}</span> : null}
      {prob ? <span className="fp-match-badge-confidence">They feel {prob}</span> : null}
      {!compact && explain ? <p className="fp-match-badge-explain">{explain}</p> : null}
    </div>
  );
}
