import type { Stage } from "../../types";

/** Official FIFA WC 2026 knockout match id → stage (M73–M104). */
export function knockoutStageFromMatchId(matchId: string): Stage | undefined {
  const num = Number(matchId.replace(/^M/, ""));
  if (!Number.isFinite(num)) return undefined;
  if (num >= 73 && num <= 88) return "R32";
  if (num >= 89 && num <= 96) return "R16";
  if (num >= 97 && num <= 100) return "QF";
  if (num >= 101 && num <= 102) return "SF";
  if (num === 103) return "ThirdPlace";
  if (num === 104) return "Final";
  return undefined;
}
