type BentoErrorCardProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function BentoErrorCard({
  title = "Something went wrong",
  message = "This section failed to load.",
  onRetry
}: BentoErrorCardProps) {
  return (
    <div className="bento-error" role="alert">
      <p className="bento-error-title">{title}</p>
      <p className="bento-error-subtitle">{message}</p>
      {onRetry ? (
        <button type="button" className="bento-retry-btn" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
