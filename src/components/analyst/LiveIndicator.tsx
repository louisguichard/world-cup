interface Props {
  connected: boolean;
  lastEventAt: number | null;
}

export function LiveIndicator({ connected, lastEventAt }: Props) {
  const ageLabel =
    lastEventAt === null
      ? "No events yet"
      : `${Math.max(0, Math.round((Date.now() - lastEventAt) / 1000))}s ago`;

  return (
    <div
      className={`live-indicator live-indicator--${connected ? "on" : "off"}`}
      aria-live="polite"
      title={connected ? "SSE connected" : "SSE disconnected — polling fallback active"}
    >
      <span className="live-indicator__dot" aria-hidden />
      <span className="live-indicator__label">{connected ? "Live" : "Offline"}</span>
      <span className="live-indicator__age">{ageLabel}</span>
    </div>
  );
}
