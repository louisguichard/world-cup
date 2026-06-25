/**
 * FIFA-accurate brand colors for high-visibility nations.
 * Keys are ESPN abbreviations (e.g. BRA, ARG). Omitted teams use ESPN live colors.
 */
export type TeamIdentityOverride = {
  primary: string;
  secondary: string;
  gradient?: [string, string];
};

export const TEAM_IDENTITY_OVERRIDES: Record<string, TeamIdentityOverride> = {
  BRA: { primary: "#009C3B", secondary: "#FFDF00", gradient: ["#009C3B", "#FFDF00"] },
  ARG: { primary: "#74ACDF", secondary: "#FFFFFF", gradient: ["#74ACDF", "#4A90D9"] },
  MEX: { primary: "#006847", secondary: "#CE1126", gradient: ["#006847", "#CE1126"] },
  USA: { primary: "#002868", secondary: "#BF0A30", gradient: ["#002868", "#BF0A30"] },
  FRA: { primary: "#002395", secondary: "#ED2939", gradient: ["#002395", "#ED2939"] },
  GER: { primary: "#000000", secondary: "#DD0000", gradient: ["#1a1a1a", "#DD0000"] },
  ESP: { primary: "#AA151B", secondary: "#F1BF00", gradient: ["#AA151B", "#F1BF00"] },
  ENG: { primary: "#FFFFFF", secondary: "#CE1124", gradient: ["#FFFFFF", "#CE1124"] },
  POR: { primary: "#006600", secondary: "#FF0000", gradient: ["#006600", "#FF0000"] },
  NED: { primary: "#FF6600", secondary: "#21468B", gradient: ["#FF6600", "#21468B"] },
  ITA: { primary: "#0066AA", secondary: "#FFFFFF", gradient: ["#0066AA", "#009246"] },
  JPN: { primary: "#BC002D", secondary: "#FFFFFF", gradient: ["#BC002D", "#1A1A1A"] },
  KOR: { primary: "#CD2E3A", secondary: "#0047A0", gradient: ["#CD2E3A", "#0047A0"] },
  CAN: { primary: "#FF0000", secondary: "#FFFFFF", gradient: ["#FF0000", "#FFFFFF"] },
  COL: { primary: "#FCD116", secondary: "#003893", gradient: ["#FCD116", "#CE1126"] }
};
