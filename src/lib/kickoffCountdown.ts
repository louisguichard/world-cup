export type KickoffCountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
};

export function getKickoffCountdownParts(kickoffIso: string, nowMs = Date.now()): KickoffCountdownParts {
  const kickoffMs = Date.parse(kickoffIso);
  if (Number.isNaN(kickoffMs)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  const totalMs = Math.max(0, kickoffMs - nowMs);
  const expired = kickoffMs <= nowMs;

  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalMs, days, hours, minutes, seconds, expired };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Human-readable countdown label for kickoff displays. */
export function formatKickoffCountdown(kickoffIso: string, nowMs = Date.now()): string {
  const parts = getKickoffCountdownParts(kickoffIso, nowMs);
  if (parts.expired) return "Starting soon";

  if (parts.days > 0) {
    return `${parts.days}d ${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
  }

  return `${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}`;
}
