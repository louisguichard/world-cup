/**
 * Identity seed data structure for 48 WC2026 teams.
 * Outputs JSON seed payload for Prisma seeding.
 * Run: node scripts/seed-identity.mjs
 */

const PROVIDERS = ["espn", "wc-live", "zafronix", "sofascore"];

// Abbreviations from wc2026TeamCatalog (48 teams)
const TEAM_ABBREVS = [
  "MEX", "CAN", "USA", "JAM", "CRC", "PAN", "HON", "SLV", "GUA", "CUW",
  "ARG", "BRA", "URU", "COL", "ECU", "PER", "CHI", "PAR", "BOL", "VEN",
  "FRA", "GER", "ESP", "POR", "ENG", "NED", "BEL", "ITA", "CRO", "SUI",
  "POL", "AUT", "DEN", "SRB", "UKR", "TUR", "WAL", "SCO", "CZE", "SVK",
  "MAR", "SEN", "NGA", "GHA", "CMR", "CIV", "TUN", "ALG", "EGY", "RSA",
  "JPN", "KOR", "AUS", "IRN", "SAU", "QAT", "IRQ", "UZB", "JOR", "IDN",
  "NZL", "CHN", "THA", "VIE", "IND", "PHI", "MAS", "SGP", "HKG", "TPE",
];

const GROUPS = "ABCDEFGHIJKL".split("");

function buildSeed() {
  const teams = TEAM_ABBREVS.slice(0, 48).map((abbrev, i) => ({
    id: abbrev.toLowerCase(),
    displayName: abbrev,
    shortCode: abbrev,
    countryCode: abbrev.slice(0, 3),
    groupId: GROUPS[Math.floor(i / 4)],
  }));

  const aliases = teams.flatMap((team) =>
    PROVIDERS.map((providerId) => ({
      canonicalId: team.id,
      entityType: "team",
      providerId,
      externalId: `${providerId}:${team.id}`,
      externalDisplayName: team.displayName,
      confidence: 1,
      method: "EXACT",
      quarantined: false,
    }))
  );

  return { teams, aliases, meta: { teamCount: teams.length, aliasCount: aliases.length } };
}

const seed = buildSeed();
console.log(JSON.stringify(seed.meta, null, 2));
console.error(`Generated ${seed.aliases.length} aliases for ${seed.teams.length} teams`);
