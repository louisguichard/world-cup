/**
 * Live ESPN audit: compare static schedule, refresh audit snapshot, print standings/thirds.
 * Run: node scripts/audit-espn-live.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
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

function groupFromAlt(note) {
  const match = note?.match(/Group ([A-L])/i);
  return match?.[1]?.toUpperCase();
}

function toUtcIso(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function main() {
  const res = await fetch(ESPN_URL);
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status}`);
  const espn = await res.json();
  const schedule = JSON.parse(readFileSync(join(ROOT, "src/data/matchSchedule.json"), "utf8"));

  const espnById = new Map();
  const espnByPair = new Map();
  for (const event of espn.events ?? []) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    const entry = {
      id: String(event.id),
      date: comp.date ?? event.date,
      group: groupFromAlt(comp.altGameNote),
      completed: Boolean(comp.status?.type?.completed),
      homeScore: home?.score,
      awayScore: away?.score,
      home: home?.team?.displayName,
      away: away?.team?.displayName,
      state: event.status?.type?.state,
    };
    espnById.set(entry.id, entry);
    const key = pairKey(entry.home, entry.away);
    if (key) espnByPair.set(key, entry);
  }

  let kickoffMismatch = 0;
  let groupMismatch = 0;
  const kickoffSamples = [];
  const groupSamples = [];

  for (const m of schedule.matches) {
    const hit = m.espnEventId
      ? espnById.get(m.espnEventId)
      : espnByPair.get(pairKey(m.homeTeam, m.awayTeam));
    if (!hit) continue;
    const staticUtc = toUtcIso(m.kickoff?.utc ?? "");
    const espnUtc = toUtcIso(hit.date);
    if (staticUtc !== espnUtc) {
      kickoffMismatch += 1;
      kickoffSamples.push({
        match: m.matchNumber,
        static: staticUtc,
        espn: espnUtc,
        teams: `${m.homeTeam} v ${m.awayTeam}`,
      });
    }
    if (hit.group && m.group && hit.group !== m.group) {
      groupMismatch += 1;
      groupSamples.push({ match: m.matchNumber, static: m.group, espn: hit.group });
    }
  }

  const groups = {};
  for (const event of espn.events ?? []) {
    const comp = event.competitions?.[0];
    const g = groupFromAlt(comp?.altGameNote);
    if (!g || !comp?.status?.type?.completed) continue;
    const home = comp.competitors.find((c) => c.homeAway === "home");
    const away = comp.competitors.find((c) => c.homeAway === "away");
    if (!groups[g]) groups[g] = [];
    groups[g].push({
      home: home.team.displayName,
      away: away.team.displayName,
      hs: Number(home.score),
      as: Number(away.score),
    });
  }

  const standings = {};
  for (const [g, ms] of Object.entries(groups)) {
    const table = {};
    for (const match of ms) {
      for (const [team, gf, ga] of [
        [match.home, match.hs, match.as],
        [match.away, match.as, match.hs],
      ]) {
        if (!table[team]) table[team] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
        table[team].gf += gf;
        table[team].ga += ga;
        if (gf > ga) {
          table[team].w += 1;
          table[team].p += 3;
        } else if (gf === ga) {
          table[team].d += 1;
          table[team].p += 1;
        } else {
          table[team].l += 1;
        }
      }
    }
    const sorted = Object.entries(table).sort(
      (a, b) =>
        b[1].p - a[1].p ||
        b[1].gf - b[1].ga - (a[1].gf - a[1].ga) ||
        b[1].gf - a[1].gf
    );
    standings[g] = sorted.map(([name, s], i) => ({ pos: i + 1, name, ...s }));
  }

  const thirds = Object.entries(standings)
    .map(([g, rows]) => ({
      group: g,
      team: rows[2]?.name,
      pts: rows[2]?.p,
      gd: rows[2].gf - rows[2].ga,
    }))
    .filter((x) => x.team);
  thirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd);

  writeFileSync(join(ROOT, ".cursor/audit-espn-snapshot.json"), `${JSON.stringify(espn, null, 2)}\n`);

  const report = {
    auditedAt: new Date().toISOString(),
    espnEvents: espn.events?.length ?? 0,
    completed: espn.events?.filter((e) => e.status?.type?.completed).length ?? 0,
    live: espn.events?.filter((e) => e.status?.type?.state === "in").length ?? 0,
    upcoming: espn.events?.filter((e) => e.status?.type?.state === "pre").length ?? 0,
    scheduleEspnIds: schedule.matches.filter((m) => m.espnEventId).length,
    kickoffMismatch,
    groupMismatch,
    kickoffSamples: kickoffSamples.slice(0, 8),
    groupSamples,
    groupStandings: standings,
    thirdPlaceByGroup: thirds,
    best8Thirds: thirds.slice(0, 8).map(
      (t, i) => `${i + 1}. ${t.team} (Group ${t.group}) — ${t.pts}pts GD${t.gd >= 0 ? "+" : ""}${t.gd}`
    ),
  };

  console.log(JSON.stringify(report, null, 2));

  if (kickoffMismatch > 0 || groupMismatch > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
