/**
 * Sync bundled player stats + WC2026 squad slugs from public GitHub sources.
 * Run: npm run sync:player-database
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/data/generated");
const OUT_PATH = join(OUT_DIR, "playerDatabase.json");

const CSV_URL =
  "https://raw.githubusercontent.com/wamiqsnippets/FIFA-FOOTYCAST-26/master/data/players_data_cleaned.csv";
const SQUADS_URL =
  "https://raw.githubusercontent.com/abobabo91/wc2026-profiles/main/data/team_squads.json";

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
}

function colIndex(headers, name) {
  return headers.indexOf(name);
}

function parseNation(raw) {
  const trimmed = (raw ?? "").trim();
  const parts = trimmed.split(/\s+/);
  const code = parts[parts.length - 1]?.toUpperCase() ?? "";
  return code.length === 3 ? code : trimmed;
}

function playerSlug(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].toLowerCase();
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return `${last}-${first}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeKey(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortNameFromFull(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name.trim();
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function toNumber(raw) {
  const n = Number.parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const [csvRes, squadsRes] = await Promise.all([fetch(CSV_URL), fetch(SQUADS_URL)]);
  if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
  if (!squadsRes.ok) throw new Error(`Squads fetch failed: ${squadsRes.status}`);

  const csvText = await csvRes.text();
  const squads = await squadsRes.json();
  const { headers, rows } = parseCsv(csvText);

  const idx = {
    player: colIndex(headers, "Player"),
    nation: colIndex(headers, "Nation"),
    pos: colIndex(headers, "Pos"),
    squad: colIndex(headers, "Squad"),
    age: colIndex(headers, "Age"),
    gls: colIndex(headers, "Gls"),
    ast: colIndex(headers, "Ast"),
    mp: colIndex(headers, "MP"),
    rating: colIndex(headers, "MVP_Score"),
  };

  if (idx.player < 0) throw new Error("CSV missing Player column");

  const players = rows
    .map((row) => {
      const name = row[idx.player]?.trim();
      if (!name) return null;
      const slug = playerSlug(name);
      return {
        name,
        shortName: shortNameFromFull(name),
        nationality: parseNation(row[idx.nation]),
        position: row[idx.pos]?.trim() ?? "",
        club: row[idx.squad]?.trim() ?? "",
        age: toNumber(row[idx.age]),
        goals: toNumber(row[idx.gls]),
        assists: toNumber(row[idx.ast]),
        appearances: toNumber(row[idx.mp]),
        rating: toNumber(row[idx.rating]),
        slug,
        key: normalizeKey(name),
      };
    })
    .filter(Boolean);

  const payload = {
    version: 1,
    syncedAt: new Date().toISOString(),
    players,
    squads,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${players.length} players + ${Object.keys(squads).length} squads → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
