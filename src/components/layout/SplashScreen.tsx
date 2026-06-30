import { useStore } from "../../store";
import { bootstrap } from "../../lib/bootstrap";
import { APP_BRAND } from "../../config/appMeta";
import { APP_COPY } from "../../lib/appCopy";
import { BrandLogo } from "../shared/BrandLogo";

const splash = APP_COPY.splash;

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
        {isSimulation ? splash.simulationError : splash.liveDataError}
      </p>
      <p className="splash-error-subtitle">{message || splash.connectionHint}</p>
      <button type="button" className="splash-retry-btn" onClick={onRetry} aria-label={splash.retryAria}>
        ↻ {splash.retryButton}
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
    <div className={`splash-screen splash-screen--${phase}`} role="dialog" aria-label={splash.loadingAria}>
      <div className="splash-celebration-bg" aria-hidden>
        <img
          className="splash-unofficial-watermark"
          src={APP_BRAND.logoUnofficial}
          alt=""
          decoding="async"
        />
        <span className="splash-celebration-orbit splash-celebration-orbit--a" />
        <span className="splash-celebration-orbit splash-celebration-orbit--b" />
        <span className="splash-celebration-rays" />
      </div>

      <div className="splash-brand">
        <span className="fwc-unify-stripe splash-unify-stripe" aria-hidden />

        <div className="splash-trophy-stage">
          <span className="splash-celebration-ring splash-celebration-ring--conic" aria-hidden />
          <span className="splash-celebration-ring splash-celebration-ring--gold" aria-hidden />
          <span className="splash-spark splash-spark--1" aria-hidden />
          <span className="splash-spark splash-spark--2" aria-hidden />
          <span className="splash-spark splash-spark--3" aria-hidden />
          <BrandLogo
            size="hero"
            variant="full"
            celebration
            className="splash-trophy-logo"
            alt=""
          />
        </div>

        <p className="splash-kicker">FIFA World Cup 2026™</p>
        <h1 className="splash-title">{APP_BRAND.splashLine1}</h1>
        <h2 className="splash-subtitle">{APP_BRAND.splashLine2}</h2>
      </div>

      {phase === "error" ? (
        <SplashErrorCard onRetry={handleRetry} />
      ) : (
        <div className="splash-progress">
          <div className="splash-progress-track">
            <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p className="splash-progress-label">{message}</p>
        </div>
      )}
    </div>
  );
}
