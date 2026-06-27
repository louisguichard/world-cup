/**
 * Authoritative team crests / flags for all 48 WC 2026 nations.
 * Used when upstream APIs return kit assets, broken URLs, or nothing at all.
 * Keys are ESPN/FIFA abbreviations.
 *
 * Prefer federation shields where stable; otherwise national flag (Wikimedia Commons).
 */
export const TEAM_LOGO_OVERRIDES: Record<string, string> = {
  ALG: "https://upload.wikimedia.org/wikipedia/commons/7/77/Flag_of_Algeria.svg",
  ARG: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Flag_of_Argentina.svg",
  AUS: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Flag_of_Australia.svg",
  AUT: "https://upload.wikimedia.org/wikipedia/commons/4/41/Flag_of_Austria.svg",
  BEL: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Royal_Belgian_FA_logo_2019.svg/500px-Royal_Belgian_FA_logo_2019.svg.png",
  BIH: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Flag_of_Bosnia_and_Herzegovina.svg",
  BRA: "https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg",
  CAN: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Canadian_Soccer_Association_logo.svg/500px-Canadian_Soccer_Association_logo.svg.png",
  CIV: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_C%C3%B4te_d%27Ivoire.svg",
  COD: "https://upload.wikimedia.org/wikipedia/en/6/62/Congolese_Association_Football_Federation_logo.png",
  COL: "https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Colombia.svg",
  CPV: "https://upload.wikimedia.org/wikipedia/commons/3/38/Flag_of_Cape_Verde.svg",
  CRO: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Flag_of_Croatia.svg",
  CUW: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Flag_of_Cura%C3%A7ao.svg",
  CZE: "https://upload.wikimedia.org/wikipedia/commons/c/cb/Flag_of_the_Czech_Republic.svg",
  ECU: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Flag_of_Ecuador.svg",
  EGY: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Egypt.svg",
  ENG: "https://upload.wikimedia.org/wikipedia/en/b/be/Flag_of_England.svg",
  ESP: "https://upload.wikimedia.org/wikipedia/en/9/9a/Flag_of_Spain.svg",
  FRA: "https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg",
  GER: "https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg",
  GHA: "https://upload.wikimedia.org/wikipedia/commons/1/19/Flag_of_Ghana.svg",
  HAI: "https://upload.wikimedia.org/wikipedia/commons/5/56/Flag_of_Haiti.svg",
  IRN: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Flag_of_Iran.svg",
  IRQ: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Iraq.svg",
  JOR: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Flag_of_Jordan.svg",
  JPN: "https://upload.wikimedia.org/wikipedia/en/9/9e/Flag_of_Japan.svg",
  KOR: "https://upload.wikimedia.org/wikipedia/commons/0/09/Flag_of_South_Korea.svg",
  KSA: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Flag_of_Saudi_Arabia.svg",
  MAR: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Flag_of_Morocco.svg",
  MEX: "https://upload.wikimedia.org/wikipedia/commons/2/2c/Federaci%C3%B3n_Mexicana_de_F%C3%BAtbol_logo_%282025%29.svg",
  NED: "https://upload.wikimedia.org/wikipedia/commons/2/20/Flag_of_the_Netherlands.svg",
  NOR: "https://upload.wikimedia.org/wikipedia/commons/d/d9/Flag_of_Norway.svg",
  NZL: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Flag_of_New_Zealand.svg",
  PAN: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Flag_of_Panama.svg",
  PAR: "https://upload.wikimedia.org/wikipedia/commons/2/27/Flag_of_Paraguay.svg",
  POR: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Portugal.svg",
  QAT: "https://upload.wikimedia.org/wikipedia/commons/6/65/Flag_of_Qatar.svg",
  RSA: "https://upload.wikimedia.org/wikipedia/commons/a/af/Flag_of_South_Africa.svg",
  SCO: "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Scotland.svg",
  SEN: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Flag_of_Senegal.svg",
  SUI: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Switzerland.svg",
  SWE: "https://upload.wikimedia.org/wikipedia/en/4/4c/Flag_of_Sweden.svg",
  TUN: "https://upload.wikimedia.org/wikipedia/commons/c/ce/Flag_of_Tunisia.svg",
  TUR: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Flag_of_Turkey.svg",
  URU: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Flag_of_Uruguay.svg",
  USA: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
  UZB: "https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg",
};

/** All 48 WC 2026 abbreviations covered by overrides. */
export const TEAM_LOGO_ABBREVIATIONS = Object.keys(TEAM_LOGO_OVERRIDES);
