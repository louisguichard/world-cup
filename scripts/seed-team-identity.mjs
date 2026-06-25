#!/usr/bin/env node
/**
 * Fetches ESPN scoreboard teams and prints abbreviation + colors for teamIdentityOverrides.ts.
 * Run: node scripts/seed-team-identity.mjs
 */
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";

function normalizeHex(color) {
  if (!color) return null;
  const t = String(color).trim();
  if (t.startsWith("#")) return t;
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t}`;
  return null;
}

async function main() {
  const res = await fetch(SCOREBOARD_URL);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  const teams = new Map();

  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    for (const c of comp.competitors ?? []) {
      const t = c.team;
      if (!t?.abbreviation) continue;
      const abbrev = t.abbreviation.toUpperCase();
      if (teams.has(abbrev)) continue;
      teams.set(abbrev, {
        abbrev,
        name: t.displayName,
        primary: normalizeHex(t.color),
        secondary: normalizeHex(t.alternateColor)
      });
    }
  }

  const sorted = [...teams.values()].sort((a, b) => a.abbrev.localeCompare(b.abbrev));
  console.log("// Generated from ESPN — merge into teamIdentityOverrides.ts as needed\n");
  for (const row of sorted) {
    if (!row.primary) continue;
    const sec = row.secondary ?? row.primary;
    console.log(
      `  ${row.abbrev}: { primary: "${row.primary}", secondary: "${sec}" }, // ${row.name}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
