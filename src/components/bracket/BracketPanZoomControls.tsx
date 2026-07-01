import { APP_COPY } from "../../lib/appCopy";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function BracketPanZoomControls({ onZoomIn, onZoomOut, onReset }: Props) {
  const copy = APP_COPY.bracket;

  return (
    <div className="split-bracket-zoom-controls" aria-label={copy.panZoomControlsLabel}>
      <button type="button" className="split-bracket-zoom-btn" onClick={onZoomOut} aria-label={copy.zoomOutLabel}>
        −
      </button>
      <button type="button" className="split-bracket-zoom-btn" onClick={onReset} aria-label={copy.resetViewLabel}>
        {copy.resetViewLabel}
      </button>
      <button type="button" className="split-bracket-zoom-btn" onClick={onZoomIn} aria-label={copy.zoomInLabel}>
        +
      </button>
    </div>
  );
}
