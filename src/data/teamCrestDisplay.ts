/** How the national crest reads against its pad — drives per-team tuning. */
export type CrestProfile = "white-crest" | "light-crest" | "dark-crest" | "balanced";

export type TeamCrestDisplay = {
  profile: CrestProfile;
  /** Inner pad behind the shield (full saturation — no white wash). */
  pad: [string, string];
  /** Optional outer frame gradient override. */
  frame?: [string, string];
  /** Inset padding inside the inner frame so crests/shields never clip (CSS %). */
  inset?: string;
};

/**
 * Per-team crest pad tuning for all 48 WC 2026 nations.
 * White/light crests get saturated, non-white pads so shields stay unmistakable.
 */
export const TEAM_CREST_DISPLAY: Record<string, TeamCrestDisplay> = {
  ALG: { profile: "balanced", pad: ["#006233", "#4F9A44"] },
  ARG: { profile: "white-crest", pad: ["#1E4A8C", "#5B9BD5"], frame: ["#74ACDF", "#1E4A8C"] },
  AUS: { profile: "balanced", pad: ["#005A25", "#00843D"] },
  AUT: { profile: "white-crest", pad: ["#9B0F1A", "#C8102E"], frame: ["#ED2939", "#9B0F1A"] },
  BEL: { profile: "dark-crest", pad: ["#1A1A1A", "#EF3340"], frame: ["#EF3340", "#FDDA24"] },
  BIH: { profile: "white-crest", pad: ["#0E224A", "#1A3D7C"], frame: ["#112855", "#0E224A"] },
  BRA: { profile: "balanced", pad: ["#006B2D", "#009C3B"], frame: ["#009C3B", "#C9A227"] },
  CAN: { profile: "white-crest", pad: ["#C8102E", "#00205B"], frame: ["#FF0000", "#00205B"] },
  CIV: { profile: "balanced", pad: ["#006B3F", "#FF8200"] },
  COD: {
    profile: "light-crest",
    pad: ["#007FFF", "#FCD116"],
    frame: ["#007FFF", "#005BB5"],
    inset: "18%",
  },
  COL: { profile: "light-crest", pad: ["#002171", "#003893"], frame: ["#003893", "#CE1126"] },
  CPV: { profile: "balanced", pad: ["#002060", "#003893"] },
  CRO: { profile: "white-crest", pad: ["#003DA5", "#C8102E"], frame: ["#FF0000", "#003DA5"] },
  CUW: { profile: "balanced", pad: ["#001A52", "#002B7F"] },
  CZE: { profile: "white-crest", pad: ["#11457E", "#C8102E"], frame: ["#D7141A", "#11457E"] },
  ECU: { profile: "light-crest", pad: ["#00205B", "#003087"], frame: ["#003087", "#FFD100"] },
  EGY: { profile: "white-crest", pad: ["#8B0000", "#C8102E"], frame: ["#C8102E", "#111111"] },
  ENG: { profile: "white-crest", pad: ["#001E60", "#CE1124"], frame: ["#CE1124", "#001E60"] },
  ESP: { profile: "balanced", pad: ["#7B1116", "#AA151B"], frame: ["#AA151B", "#C9A227"] },
  FRA: { profile: "white-crest", pad: ["#001E60", "#002395"], frame: ["#002395", "#ED2939"] },
  GER: { profile: "dark-crest", pad: ["#111111", "#3D3D3D"], frame: ["#1A1A1A", "#DD0000"] },
  GHA: { profile: "balanced", pad: ["#004D2E", "#006B3F"], frame: ["#006B3F", "#FCD116"] },
  HAI: { profile: "balanced", pad: ["#001566", "#00209F"] },
  IRN: { profile: "white-crest", pad: ["#0F5132", "#239F40"], frame: ["#239F40", "#8B0000"] },
  IRQ: { profile: "white-crest", pad: ["#083D24", "#0A4D2E"], frame: ["#0A4D2E", "#CE1126"] },
  JOR: { profile: "white-crest", pad: ["#005A2B", "#111111"], frame: ["#007A3D", "#111111"] },
  JPN: { profile: "white-crest", pad: ["#8B0019", "#BC002D"], frame: ["#BC002D", "#1A1A1A"] },
  KOR: { profile: "balanced", pad: ["#002F6C", "#CD2E3A"], frame: ["#CD2E3A", "#0047A0"] },
  KSA: { profile: "white-crest", pad: ["#004225", "#006C35"], frame: ["#006C35", "#004225"] },
  MAR: { profile: "balanced", pad: ["#004D28", "#C1272D"], frame: ["#C1272D", "#006233"] },
  MEX: {
    profile: "dark-crest",
    pad: ["#F2EEE6", "#DAD4C8"],
    frame: ["#006847", "#CE1126"],
    inset: "15%",
  },
  NED: { profile: "balanced", pad: ["#CC5200", "#21468B"], frame: ["#FF6600", "#21468B"] },
  NOR: { profile: "white-crest", pad: ["#00205B", "#BA0C2F"], frame: ["#BA0C2F", "#00205B"] },
  NZL: { profile: "white-crest", pad: ["#111111", "#2D2D2D"], frame: ["#000000", "#444444"] },
  PAN: { profile: "balanced", pad: ["#002A52", "#D21034"], frame: ["#D21034", "#005293"] },
  PAR: { profile: "white-crest", pad: ["#002060", "#D52B1E"], frame: ["#D52B1E", "#0038A8"] },
  POR: { profile: "balanced", pad: ["#004D18", "#006600"], frame: ["#006600", "#CC0000"] },
  QAT: { profile: "white-crest", pad: ["#5C0F24", "#8B1538"], frame: ["#8B1538", "#5C0F24"] },
  RSA: { profile: "light-crest", pad: ["#006B3F", "#004D2E"], frame: ["#007A4D", "#FFB81C"] },
  SCO: { profile: "white-crest", pad: ["#002F7A", "#0065BD"], frame: ["#0065BD", "#003DA5"] },
  SEN: { profile: "balanced", pad: ["#006B35", "#00853F"], frame: ["#00853F", "#FDEF42"] },
  SUI: { profile: "white-crest", pad: ["#CC0000", "#8B0000"], frame: ["#FF0000", "#8B0000"] },
  SWE: { profile: "light-crest", pad: ["#004B78", "#006AA7"], frame: ["#006AA7", "#C9A227"] },
  TUN: { profile: "white-crest", pad: ["#A8000E", "#E70013"], frame: ["#E70013", "#A8000E"] },
  TUR: { profile: "white-crest", pad: ["#A60D12", "#E30A17"], frame: ["#E30A17", "#A60D12"] },
  URU: { profile: "white-crest", pad: ["#1E4A8C", "#5B9BD5"], frame: ["#75AADB", "#1E4A8C"] },
  USA: { profile: "white-crest", pad: ["#001A45", "#002868"], frame: ["#002868", "#BF0A30"] },
  UZB: { profile: "white-crest", pad: ["#138029", "#1EB53A"], frame: ["#1EB53A", "#007A99"] },
};
