import { APP_COPY } from "../../lib/appCopy";

const errors = APP_COPY.errors;

type BentoErrorCardProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function BentoErrorCard({
  title = errors.somethingWrong,
  message = errors.sectionFailed,
  onRetry
}: BentoErrorCardProps) {
  return (
    <div className="bento-error" role="alert">
      <p className="bento-error-title">{title}</p>
      <p className="bento-error-subtitle">{message}</p>
      {onRetry ? (
        <button type="button" className="bento-retry-btn" onClick={onRetry}>
          {errors.tryAgain}
        </button>
      ) : null}
    </div>
  );
}
