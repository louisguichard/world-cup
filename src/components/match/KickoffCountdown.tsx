import { useKickoffCountdown } from "../../hooks/useKickoffCountdown";

type Props = {
  kickoffUtc: string;
  className?: string;
};

/** Compact ticking clock until kickoff. */
export function KickoffCountdown({ kickoffUtc, className = "" }: Props) {
  const label = useKickoffCountdown(kickoffUtc);

  if (!label) return null;

  return (
    <span
      className={`kickoff-countdown ${className}`.trim()}
      role="timer"
      aria-live="polite"
      aria-label={`Kickoff in ${label}`}
    >
      <span className="kickoff-countdown-icon" aria-hidden>
        ⏱
      </span>
      <span className="kickoff-countdown-label">{label}</span>
    </span>
  );
}
