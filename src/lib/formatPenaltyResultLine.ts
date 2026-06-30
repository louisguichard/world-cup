/** Format penalty shootout line with optional bold winner side. */
export function formatPenaltyResultLine(
  homeScore: number,
  awayScore: number
): { prefix: string; home: string; sep: string; away: string } {
  return {
    prefix: "Penalties:",
    home: String(homeScore),
    sep: "–",
    away: String(awayScore),
  };
}

export function penaltyResultAriaLabel(
  homeFt: number,
  awayFt: number,
  homePens: number,
  awayPens: number
): string {
  return `Penalties ${homePens} to ${awayPens} after ${homeFt}–${awayFt}`;
}
