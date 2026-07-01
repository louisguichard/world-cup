export function isOfficialMatchId(matchId: string): boolean {
  const num = Number(matchId.replace(/^M/, ""));
  return Number.isFinite(num) && num >= 1 && num <= 104;
}
