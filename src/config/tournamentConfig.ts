export type TournamentPhase = "GROUP" | "R32" | "R16" | "QF" | "SF" | "FINAL" | "COMPLETE";

export type TournamentEditionConfig = {
  id: string;
  groupStageEndUTC: string;
  r32StartUTC: string;
  r16StartUTC: string;
  qfStartUTC: string;
  sfStartUTC: string;
  finalDateUTC: string;
};

export const WC2026: TournamentEditionConfig = {
  id: "wc2026",
  groupStageEndUTC: "2026-06-27T23:59:59Z",
  r32StartUTC: "2026-06-28T00:00:00Z",
  r16StartUTC: "2026-07-05T00:00:00Z",
  qfStartUTC: "2026-07-11T00:00:00Z",
  sfStartUTC: "2026-07-15T00:00:00Z",
  finalDateUTC: "2026-07-19T00:00:00Z"
};

export function getCurrentPhase(
  config: TournamentEditionConfig,
  now: Date = new Date()
): TournamentPhase {
  const t = now.getTime();
  if (t > Date.parse(config.finalDateUTC) + 86_400_000) return "COMPLETE";
  if (t >= Date.parse(config.sfStartUTC)) return "SF";
  if (t >= Date.parse(config.qfStartUTC)) return "QF";
  if (t >= Date.parse(config.r16StartUTC)) return "R16";
  if (t >= Date.parse(config.r32StartUTC)) return "R32";
  return "GROUP";
}

export function isGroupStageOver(
  config: TournamentEditionConfig,
  now: Date = new Date()
): boolean {
  return now.getTime() > Date.parse(config.groupStageEndUTC);
}
