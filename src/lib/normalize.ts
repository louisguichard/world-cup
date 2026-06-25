const aliasToCanonical: Record<string, string> = {
  bosniaherzegovina: "bosniaherzegovina",
  bosniaandherzegovina: "bosniaherzegovina",
  capeverde: "capeverde",
  caboverde: "capeverde",
  congodr: "drcongo",
  cod: "drcongo",
  democraticrepublicofcongo: "drcongo",
  drc: "drcongo",
  drcongo: "drcongo",
  czechrepublic: "czechia",
  czechia: "czechia",
  coteivoire: "ivorycoast",
  cotedivoire: "ivorycoast",
  ivorycoast: "ivorycoast",
  curacao: "curacao",
  curaçao: "curacao",
  iran: "iran",
  iriran: "iran",
  korea: "southkorea",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  southkorea: "southkorea",
  saudiarabia: "saudiarabia",
  ksa: "saudiarabia",
  suisse: "switzerland",
  switzerland: "switzerland",
  türkiye: "turkiye",
  turkiye: "turkiye",
  turkey: "turkiye",
  unitedstates: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  usa: "unitedstates",
  usmnt: "unitedstates",
  newzealand: "newzealand",
  southafrica: "southafrica"
};

export function normalizeName(value: string): string {
  const stripped = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

  return aliasToCanonical[stripped] ?? stripped;
}

/** Canonical ISO instant for cross-provider kickoff matching (ESPN uses `Z`, JSON uses `:00Z`). */
export function normalizeKickoffUtc(iso: string): string {
  return new Date(iso).toISOString();
}

export function pairKey(first: string, second: string): string {
  return [normalizeName(first), normalizeName(second)].sort().join("__");
}

/** UTC-noon date key for cross-provider match linking (Fix 1–2). */
export function matchCompositeKey(teamA: string, teamB: string, isoDate: string): string {
  const d = new Date(isoDate);
  d.setUTCHours(12, 0, 0, 0);
  const dateKey = d.toISOString().slice(0, 10);
  return `${pairKey(teamA, teamB)}__${dateKey}`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
