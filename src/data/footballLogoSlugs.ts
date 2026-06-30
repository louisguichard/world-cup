/**
 * ESPN/FIFA abbrev → football-logos.cc slug for WC 2026 national team crests.
 * Assets live under public/logos/teams/{size}/{slug}.png (synced via pnpm logos:sync).
 */
export const FOOTBALL_LOGO_SLUGS: Record<string, string> = {
  ALG: "algeria",
  ARG: "argentina",
  AUS: "australia",
  AUT: "austria",
  BEL: "belgium",
  BIH: "bosnia-and-herzegovina",
  BRA: "brazil",
  CAN: "canada",
  CIV: "cote-d-ivoire",
  COD: "congo-dr",
  COL: "colombia",
  CPV: "cabo-verde",
  CRO: "croatia",
  CUW: "curacao",
  CZE: "czech-republic",
  ECU: "ecuador",
  EGY: "egypt",
  ENG: "england",
  ESP: "spain",
  FRA: "france",
  GER: "germany",
  GHA: "ghana",
  HAI: "haiti",
  IRN: "iran",
  IRQ: "iraq",
  JOR: "jordan",
  JPN: "japan",
  KOR: "south-korea",
  KSA: "saudi-arabia",
  MAR: "morocco",
  MEX: "mexico",
  NED: "dutch",
  NOR: "norway",
  NZL: "new-zealand",
  PAN: "panama",
  PAR: "paraguay",
  POR: "portuguese-football-federation",
  QAT: "qatar",
  RSA: "south-africa",
  SCO: "scotland",
  SEN: "senegal",
  SUI: "switzerland",
  SWE: "sweden",
  TUN: "tunisia",
  TUR: "turkey",
  URU: "uruguay",
  USA: "usa",
  UZB: "uzbekistan",
};

export const FOOTBALL_LOGO_ABBREVIATIONS = Object.keys(FOOTBALL_LOGO_SLUGS);

export function footballLogoSlugForAbbrev(abbrev: string | undefined | null): string | undefined {
  if (!abbrev) return undefined;
  return FOOTBALL_LOGO_SLUGS[abbrev.toUpperCase()];
}
