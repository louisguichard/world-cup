import { getPrimaryBroadcast } from "../../services/BroadcastLookup";

type Props = {
  matchId?: string;
  kickoffUtc: string;
  variant?: "default" | "hero";
};

export function BroadcastBar({ matchId, kickoffUtc, variant = "default" }: Props) {
  const primary = getPrimaryBroadcast(matchId, kickoffUtc);
  if (!primary) return null;

  const barClass = variant === "hero" ? "broadcast-bar broadcast-bar--hero" : "broadcast-bar";

  return (
    <div className={barClass}>
      <span className="network-badge network-badge--en">
        {primary.english}
        {primary.streamingNote ? (
          <span className="broadcast-streaming-note"> {primary.streamingNote}</span>
        ) : null}
      </span>
      <span className="network-badge network-badge--es">{primary.spanish}</span>
      {primary.isConcurrent ? (
        <span className="broadcast-concurrent-icon" title="Concurrent broadcast" aria-label="Concurrent broadcast">
          ⚡
        </span>
      ) : null}
    </div>
  );
}
