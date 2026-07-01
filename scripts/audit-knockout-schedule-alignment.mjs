#!/usr/bin/env node
/**
 * Audit FIFA schedule M73–M104 alignment:
 * - world_cup_2026_knockout_bracket.json R32 seeds + progression
 * - matchSchedule.json placeholders + espnEventId
 * - optional reference results JSON (team pairs)
 *
 * Usage:
 *   node scripts/audit-knockout-schedule-alignment.mjs
 *   node scripts/audit-knockout-schedule-alignment.mjs --results ~/Downloads/gemini-code-1782863890321.json
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadJson(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), "utf8"));
}

function parseSeed(raw) {
  return raw.trim().split(/\s+/)[0]?.replace(/[()]/g, "") ?? raw;
}

function normalizeTeam(name) {
  return name.trim().toLowerCase();
}

function parseResultsArg() {
  const idx = process.argv.indexOf("--results");
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return JSON.parse(readFileSync(process.argv[idx + 1], "utf8"));
}

function scheduleR32Entries(schedule) {
  return schedule.matches
    .filter((m) => m.matchNumber >= 73 && m.matchNumber <= 88)
    .sort((a, b) => a.matchNumber - b.matchNumber);
}

function parseSchedulePlaceholder(entry) {
  const ph = entry.bracketPlaceholder ?? "";
  if (ph.includes(" vs ")) {
    const [home, away] = ph.split(" vs ").map((s) => s.trim());
    return { home, away, template: ph };
  }
  const home = entry.homeTeam ?? "";
  const away = entry.awayTeam ?? "";
  return { home, away, template: ph || `${home} vs ${away}` };
}

function r16FeedersFromSchedule(schedule) {
  const entries = schedule.matches
    .filter((m) => m.matchNumber >= 89 && m.matchNumber <= 96)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const map = {};
  for (const entry of entries) {
    const ph = entry.bracketPlaceholder ?? "";
    const match = ph.match(/W(\d+)\s+vs\s+W(\d+)/i);
    if (!match) continue;
    map[`M${entry.matchNumber}`] = [`M${match[1]}`, `M${match[2]}`];
  }
  return map;
}

function r16FeedersFromBracketJson(bracket) {
  const map = {};
  for (const [num, spec] of Object.entries(bracket.tournament_info.bracket_progression.round_of_16)) {
    map[`M${num}`] = spec.from.map((f) => `M${f}`);
  }
  return map;
}

const bracket = loadJson("src/data/world_cup_2026_knockout_bracket.json");
const schedule = loadJson("src/data/matchSchedule.json");
const resultsDoc = parseResultsArg();

const r32Json = Object.entries(bracket.tournament_info.round_of_32_matches)
  .sort(([a], [b]) => Number(a) - Number(b))
  .map(([num, slots]) => ({
    matchId: `M${num}`,
    homeSeed: parseSeed(slots.home),
    awaySeed: parseSeed(slots.away),
    homeLabel: slots.home,
    awayLabel: slots.away,
  }));

const scheduleR32 = scheduleR32Entries(schedule);
const espnByMatchId = Object.fromEntries(
  scheduleR32.map((e) => [`M${e.matchNumber}`, e.espnEventId ?? null])
);

const issues = [];
const ok = [];

for (const jsonSlot of r32Json) {
  const sched = scheduleR32.find((e) => e.matchNumber === Number(jsonSlot.matchId.slice(1)));
  if (!sched) {
    issues.push({ kind: "missing_schedule", matchId: jsonSlot.matchId });
    continue;
  }
  if (!sched.espnEventId) {
    issues.push({ kind: "missing_espn", matchId: jsonSlot.matchId });
  }
  ok.push({
    matchId: jsonSlot.matchId,
    espnEventId: sched.espnEventId,
    seeds: `${jsonSlot.homeSeed} vs ${jsonSlot.awaySeed}`,
    teams: `${jsonSlot.homeLabel} vs ${jsonSlot.awayLabel}`,
    scheduleTemplate: parseSchedulePlaceholder(sched).template,
  });
}

const schedR16 = r16FeedersFromSchedule(schedule);
const jsonR16 = r16FeedersFromBracketJson(bracket);

for (const [matchId, feeders] of Object.entries(jsonR16)) {
  const schedFeeders = schedR16[matchId];
  if (!schedFeeders) {
    issues.push({ kind: "missing_schedule_r16", matchId });
    continue;
  }
  const same =
    schedFeeders[0] === feeders[0] && schedFeeders[1] === feeders[1];
  if (!same) {
    issues.push({
      kind: "r16_feeder_mismatch",
      matchId,
      schedule: schedFeeders,
      bracketJson: feeders,
    });
  }
}

if (resultsDoc?.matches) {
  const r32Results = resultsDoc.matches.filter(
    (m) =>
      (m.round ?? m.tournament_phase ?? "").toLowerCase().includes("round of 32") ||
      (m.round ?? m.tournament_phase ?? "").toLowerCase().includes("round_of_32")
  );

  for (const result of r32Results) {
    const home = normalizeTeam(result.home_team);
    const away = normalizeTeam(result.away_team);
    const found = r32Json.find((slot) => {
      const h = normalizeTeam(slot.homeLabel.replace(/^[123][A-L]\s*/, "").replace(/[()]/g, ""));
      const a = normalizeTeam(slot.awayLabel.replace(/^[123][A-L]\s*/, "").replace(/[()]/g, ""));
      const slotHome = slot.homeLabel.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
      const slotAway = slot.awayLabel.match(/\(([^)]+)\)/)?.[1]?.toLowerCase();
      return (
        (slotHome === home && slotAway === away) ||
        (slotHome === away && slotAway === home)
      );
    });
    if (!found) {
      issues.push({
        kind: "result_not_in_bracket",
        pairing: `${result.home_team} vs ${result.away_team}`,
        score: result.score,
      });
    } else {
      ok.push({
        kind: "result_mapped",
        matchId: found.matchId,
        espnEventId: espnByMatchId[found.matchId],
        pairing: `${result.home_team} vs ${result.away_team}`,
        score: result.score,
      });
    }
  }
}

console.log("=== Knockout schedule alignment audit ===\n");
console.log(`R32 slots checked: ${r32Json.length}`);
console.log(`R16 feeder pairs checked: ${Object.keys(jsonR16).length}`);
console.log(`Issues: ${issues.length}\n`);

if (issues.length) {
  console.log("ISSUES:");
  for (const issue of issues) {
    console.log(JSON.stringify(issue));
  }
  console.log("");
}

console.log("R32 CANONICAL MAP (schedule M## / ESPN):");
for (const row of ok.filter((r) => r.matchId)) {
  console.log(
    `  ${row.matchId}  espn=${row.espnEventId ?? "—"}  ${row.seeds}  [${row.teams}]`
  );
}

process.exit(issues.length > 0 ? 1 : 0);
