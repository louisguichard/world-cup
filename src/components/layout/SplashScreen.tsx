import { useStore } from "../../store";
import { bootstrap } from "../../lib/bootstrap";

type SplashErrorCardProps = {
  onRetry: () => void;
};

function SplashErrorCard({ onRetry }: SplashErrorCardProps) {
  const message = useStore((s) => s.splashMessage);
  const isSimulation = /simulation/i.test(message);

  return (
    <div className="splash-error">
      <span className="splash-error-icon" aria-hidden>
        ⚠️
      </span>
      <p className="splash-error-title">
        {isSimulation ? "Simulation could not complete" : "Could not reach live match data"}
      </p>
      <p className="splash-error-subtitle">{message || "Check your connection and retry"}</p>
      <button type="button" className="splash-retry-btn" onClick={onRetry} aria-label="Retry loading match data">
        ↻ Try Again
      </button>
    </div>
  );
}

export function SplashScreen() {
  const phase = useStore((s) => s.splashPhase);
  const progress = useStore((s) => s.splashProgress);
  const message = useStore((s) => s.splashMessage);

  if (phase === "done") return null;

  const handleRetry = () => {
    void bootstrap();
  };

  return (
    <div className={`splash-screen splash-screen--${phase}`} role="dialog" aria-label="Loading">
      <div className="splash-brand">
        <span className="splash-trophy" aria-hidden>
          🏆
        </span>
        <h1 className="splash-title">ROAD TO THE</h1>
        <h2 className="splash-subtitle">WORLD CUP FINAL 2026</h2>
      </div>

      {phase === "error" ? (
        <SplashErrorCard onRetry={handleRetry} />
      ) : (
        <div className="splash-progress">
          <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
          <p className="splash-progress-label">{message}</p>
        </div>
      )}
    </div>
  );
}
