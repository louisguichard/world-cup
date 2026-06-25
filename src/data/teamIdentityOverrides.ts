/**
 * FIFA-accurate brand colors for WC 2026 nations (48 teams).
 * Keys are ESPN abbreviations. Omitted teams use ESPN live colors at runtime.
 */
export type TeamIdentityOverride = {
  primary: string;
  secondary: string;
  gradient?: [string, string];
};

export const TEAM_IDENTITY_OVERRIDES: Record<string, TeamIdentityOverride> = {
  ALG: { primary: "#4F9A44", secondary: "#FFFFFF", gradient: ["#4F9A44", "#006233"] },
  ARG: { primary: "#74ACDF", secondary: "#FFFFFF", gradient: ["#74ACDF", "#4A90D9"] },
  AUS: { primary: "#00843D", secondary: "#FFCD00", gradient: ["#00843D", "#FFCD00"] },
  AUT: { primary: "#ED2939", secondary: "#FFFFFF", gradient: ["#ED2939", "#C8102E"] },
  BEL: { primary: "#EF3340", secondary: "#000000", gradient: ["#EF3340", "#FDDA24"] },
  BIH: { primary: "#112855", secondary: "#FFFFFF", gradient: ["#112855", "#1A3D7C"] },
  BRA: { primary: "#009C3B", secondary: "#FFDF00", gradient: ["#009C3B", "#FFDF00"] },
  CAN: { primary: "#FF0000", secondary: "#FFFFFF", gradient: ["#FF0000", "#FFFFFF"] },
  CIV: { primary: "#FF8200", secondary: "#009639", gradient: ["#FF8200", "#009639"] },
  COD: { primary: "#007FFF", secondary: "#FCD116", gradient: ["#007FFF", "#FCD116"] },
  COL: { primary: "#FCD116", secondary: "#003893", gradient: ["#FCD116", "#CE1126"] },
  CPV: { primary: "#003893", secondary: "#EF3340", gradient: ["#003893", "#EF3340"] },
  CRO: { primary: "#FF0000", secondary: "#003DA5", gradient: ["#FF0000", "#003DA5"] },
  CUW: { primary: "#002B7F", secondary: "#FBE122", gradient: ["#002B7F", "#FBE122"] },
  CZE: { primary: "#D7141A", secondary: "#FFFFFF", gradient: ["#D7141A", "#11457E"] },
  ECU: { primary: "#FFD100", secondary: "#003087", gradient: ["#FFD100", "#003087"] },
  EGY: { primary: "#C8102E", secondary: "#FFFFFF", gradient: ["#C8102E", "#000000"] },
  ENG: { primary: "#FFFFFF", secondary: "#CE1124", gradient: ["#FFFFFF", "#CE1124"] },
  ESP: { primary: "#AA151B", secondary: "#F1BF00", gradient: ["#AA151B", "#F1BF00"] },
  FRA: { primary: "#002395", secondary: "#ED2939", gradient: ["#002395", "#ED2939"] },
  GER: { primary: "#000000", secondary: "#DD0000", gradient: ["#1A1A1A", "#DD0000"] },
  GHA: { primary: "#006B3F", secondary: "#FCD116", gradient: ["#006B3F", "#FCD116"] },
  HAI: { primary: "#00209F", secondary: "#D21034", gradient: ["#00209F", "#D21034"] },
  IRN: { primary: "#239F40", secondary: "#FFFFFF", gradient: ["#239F40", "#DA0000"] },
  IRQ: { primary: "#0A4D2E", secondary: "#FFFFFF", gradient: ["#0A4D2E", "#CE1126"] },
  JOR: { primary: "#007A3D", secondary: "#FFFFFF", gradient: ["#007A3D", "#000000"] },
  JPN: { primary: "#BC002D", secondary: "#FFFFFF", gradient: ["#BC002D", "#1A1A1A"] },
  KOR: { primary: "#CD2E3A", secondary: "#0047A0", gradient: ["#CD2E3A", "#0047A0"] },
  KSA: { primary: "#006C35", secondary: "#FFFFFF", gradient: ["#006C35", "#006C35"] },
  MAR: { primary: "#C1272D", secondary: "#006233", gradient: ["#C1272D", "#006233"] },
  MEX: { primary: "#006847", secondary: "#CE1126", gradient: ["#006847", "#CE1126"] },
  NED: { primary: "#FF6600", secondary: "#21468B", gradient: ["#FF6600", "#21468B"] },
  NOR: { primary: "#BA0C2F", secondary: "#00205B", gradient: ["#BA0C2F", "#00205B"] },
  NZL: { primary: "#000000", secondary: "#FFFFFF", gradient: ["#000000", "#FFFFFF"] },
  PAN: { primary: "#D21034", secondary: "#005293", gradient: ["#D21034", "#005293"] },
  PAR: { primary: "#D52B1E", secondary: "#0038A8", gradient: ["#D52B1E", "#0038A8"] },
  POR: { primary: "#006600", secondary: "#FF0000", gradient: ["#006600", "#FF0000"] },
  QAT: { primary: "#8B1538", secondary: "#FFFFFF", gradient: ["#8B1538", "#A6194B"] },
  RSA: { primary: "#FFB81C", secondary: "#007A4D", gradient: ["#FFB81C", "#007A4D"] },
  SCO: { primary: "#0065BD", secondary: "#FFFFFF", gradient: ["#0065BD", "#003DA5"] },
  SEN: { primary: "#00853F", secondary: "#FDEF42", gradient: ["#00853F", "#FDEF42"] },
  SUI: { primary: "#FF0000", secondary: "#FFFFFF", gradient: ["#FF0000", "#FFFFFF"] },
  SWE: { primary: "#006AA7", secondary: "#FECC00", gradient: ["#006AA7", "#FECC00"] },
  TUN: { primary: "#E70013", secondary: "#FFFFFF", gradient: ["#E70013", "#C40010"] },
  TUR: { primary: "#E30A17", secondary: "#FFFFFF", gradient: ["#E30A17", "#C8102E"] },
  URU: { primary: "#75AADB", secondary: "#FFFFFF", gradient: ["#75AADB", "#4A90D9"] },
  USA: { primary: "#002868", secondary: "#BF0A30", gradient: ["#002868", "#BF0A30"] },
  UZB: { primary: "#1EB53A", secondary: "#0099B5", gradient: ["#1EB53A", "#0099B5"] }
};
