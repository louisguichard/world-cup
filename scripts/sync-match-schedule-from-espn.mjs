/**
 * Sync src/data/matchSchedule.json kickoffs, groups, and ESPN ids from live scoreboard.
 * Run: node scripts/sync-match-schedule-from-espn.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEDULE_PATH = join(ROOT, "src/data/matchSchedule.json");
const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";

const TEAM_ALIASES = {
  algeria: "ALG",
  argentina: "ARG",
  australia: "AUS",
  austria: "AUT",
  belgium: "BEL",
  bosnia: "BIH",
  "bosnia and herzegovina": "BIH",
  "bosnia herzegovina": "BIH",
  brazil: "BRA",
  canada: "CAN",
  "ivory coast": "CIV",
  "congo dr": "COD",
  colombia: "COL",
  "cape verde": "CPV",
  croatia: "CRO",
  curacao: "CUW",
  czechia: "CZE",
  ecuador: "ECU",
  egypt: "EGY",
  england: "ENG",
  spain: "ESP",
  france: "FRA",
  germany: "GER",
  ghana: "GHA",
  haiti: "HAI",
  iran: "IRN",
  iraq: "IRQ",
  jordan: "JOR",
  japan: "JPN",
  "south korea": "KOR",
  "saudi arabia": "KSA",
  morocco: "MAR",
  mexico: "MEX",
  netherlands: "NED",
  norway: "NOR",
  "new zealand": "NZL",
  panama: "PAN",
  paraguay: "PAR",
  portugal: "POR",
  qatar: "QAT",
  "south africa": "RSA",
  scotland: "SCO",
  senegal: "SEN",
  switzerland: "SUI",
  sweden: "SWE",
  tunisia: "TUN",
  turkiye: "TUR",
  turkey: "TUR",
  uruguay: "URU",
  "united states": "USA",
  uzbekistan: "UZB",
};

function normalizeName(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAbbrev(name) {
  if (!name) return undefined;
  const normalized = normalizeName(name);
  if (TEAM_ALIASES[normalized]) return TEAM_ALIASES[normalized];
  for (const [alias, abbrev] of Object.entries(TEAM_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) return abbrev;
  }
  return undefined;
}

function pairKey(home, away) {
  const a = resolveAbbrev(home);
  const b = resolveAbbrev(away);
  if (!a || !b) return null;
  return [a, b].sort().join("|");
}

function toUtcIso(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function groupFromAlt(note) {
  const match = note?.match(/Group ([A-L])/i);
  return match?.[1]?.toUpperCase();
}

async function main() {
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);
  const espn = await res.json();

  const espnByPair = new Map();
  const espnEvents = [];
  for (const event of espn.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home")?.team?.displayName;
    const away = comp.competitors?.find((c) => c.homeAway === "away")?.team?.displayName;
    const key = pairKey(home, away);
    const entry = {
      id: String(event.id),
      date: comp.date ?? event.date,
      group: groupFromAlt(comp.altGameNote),
      stage: event.season?.slug,
      home,
      away,
      key,
    };
    espnEvents.push(entry);
    if (key) espnByPair.set(key, entry);
  }

  const usedEspnIds = new Set();

  const schedule = JSON.parse(readFileSync(SCHEDULE_PATH, "utf8"));
  let updatedKickoff = 0;
  let updatedGroup = 0;
  let linked = 0;
  const unmatched = [];

  function applyEspnHit(match, hit) {
    if (!hit || usedEspnIds.has(hit.id)) return false;
    usedEspnIds.add(hit.id);
    linked += 1;
    const nextUtc = toUtcIso(hit.date);
    if (match.kickoff?.utc !== nextUtc) {
      match.kickoff.utc = nextUtc;
      updatedKickoff += 1;
    }
    if (hit.group && match.group && match.group !== hit.group) {
      match.group = hit.group;
      updatedGroup += 1;
    }
    match.espnEventId = hit.id;
    return true;
  }

  // Pass 1: known nation pairs (group stage + R32 with resolved teams)
  for (const match of schedule.matches) {
    if (!match.homeTeamKnown || !match.awayTeamKnown) continue;
    const key = pairKey(match.homeTeam, match.awayTeam);
    if (!key) {
      unmatched.push({ matchNumber: match.matchNumber, reason: "abbrev" });
      continue;
    }
    const hit = espnByPair.get(key);
    if (!hit) {
      unmatched.push({ matchNumber: match.matchNumber, teams: `${match.homeTeam} v ${match.awayTeam}` });
      continue;
    }
    applyEspnHit(match, hit);
  }

  // Pass 2: knockout placeholders — align remaining ESPN events to static order by date
  const staticOpen = schedule.matches
    .filter((m) => !m.espnEventId && m.matchNumber >= 73)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const espnOpen = espnEvents
    .filter((e) => !usedEspnIds.has(e.id))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  for (let i = 0; i < staticOpen.length && i < espnOpen.length; i += 1) {
    applyEspnHit(staticOpen[i], espnOpen[i]);
  }

  for (const match of schedule.matches) {
    if (match.espnEventId) continue;
    if (match.matchNumber < 73) {
      unmatched.push({ matchNumber: match.matchNumber, teams: `${match.homeTeam} v ${match.awayTeam}` });
    }
  }

  schedule.meta.generatedDate = new Date().toISOString().slice(0, 10);
  schedule.meta.espnSyncedAt = new Date().toISOString();
  schedule.meta.espnEventCount = espn.events?.length ?? 0;

  writeFileSync(SCHEDULE_PATH, `${JSON.stringify(schedule, null, 2)}\n`);

  const totalLinked = schedule.matches.filter((m) => m.espnEventId).length;

  console.log(
    JSON.stringify(
      {
        linked,
        totalLinked,
        updatedKickoff,
        updatedGroup,
        unmatched: unmatched.length,
        unmatchedSample: unmatched.slice(0, 8),
      },
      null,
      2
    )
  );

  if (totalLinked < 104) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
