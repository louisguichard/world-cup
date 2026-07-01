import { getAllScheduleEntries } from "../../services/BroadcastLookup";
import { resolveCatalogTeamIdByName } from "../../data/wc2026TeamCatalog";
import type { MatchScheduleEntry, Stage, GroupLetter } from "../../types";
import { groupLetters } from "../../types";
import type { FixtureRegistry, FixtureRegistryEntry } from "./types";
import { isOfficialMatchId } from "./isOfficialMatchId";

function pairKey(homeId: string, awayId: string): string {
  return [homeId, awayId].sort().join("|");
}

function stageFromEntry(entry: MatchScheduleEntry): Stage | undefined {
  const raw = entry.stage?.toLowerCase() ?? "";
  if (raw.includes("round_of_32") || raw === "r32") return "R32";
  if (raw.includes("round_of_16") || raw === "r16") return "R16";
  if (raw.includes("quarter")) return "QF";
  if (raw.includes("semi")) return "SF";
  if (raw.includes("third")) return "ThirdPlace";
  if (raw === "final") return "Final";
  return undefined;
}

function groupFromEntry(entry: MatchScheduleEntry): GroupLetter | undefined {
  const g = entry.group?.trim().toUpperCase();
  if (g && (groupLetters as readonly string[]).includes(g)) return g as GroupLetter;
  return undefined;
}

function entryToFixture(entry: MatchScheduleEntry): FixtureRegistryEntry | null {
  const canonicalId = `M${entry.matchNumber}`;
  if (!isOfficialMatchId(canonicalId)) return null;

  const kickoffMs = Date.parse(entry.kickoff.utc);
  if (!Number.isFinite(kickoffMs)) return null;

  const homeTeamId =
    resolveCatalogTeamIdByName(entry.homeTeam) ??
    resolveCatalogTeamIdByName(entry.homeTeam.replace(/^1st Group /i, "")) ??
    "";
  const awayTeamId =
    resolveCatalogTeamIdByName(entry.awayTeam) ??
    resolveCatalogTeamIdByName(entry.awayTeam.replace(/^2nd Group /i, "")) ??
    "";

  return {
    canonicalId,
    espnEventId: entry.espnEventId,
    kickoffMs,
    homeTeamId,
    awayTeamId,
    stage: stageFromEntry(entry),
    group: groupFromEntry(entry),
    venue: `${entry.venue.name}, ${entry.venue.city}`,
  };
}

export function buildFixtureRegistry(
  entries: MatchScheduleEntry[] = getAllScheduleEntries()
): FixtureRegistry {
  const byMatchId = new Map<string, FixtureRegistryEntry>();
  const byEspnEventId = new Map<string, string>();
  const byPair = new Map<string, FixtureRegistryEntry[]>();

  for (const entry of entries) {
    const fixture = entryToFixture(entry);
    if (!fixture) continue;

    byMatchId.set(fixture.canonicalId, fixture);
    if (fixture.espnEventId) {
      byEspnEventId.set(fixture.espnEventId, fixture.canonicalId);
    }

    if (fixture.homeTeamId && fixture.awayTeamId) {
      const key = pairKey(fixture.homeTeamId, fixture.awayTeamId);
      const list = byPair.get(key) ?? [];
      list.push(fixture);
      byPair.set(key, list);
    }
  }

  for (const list of byPair.values()) {
    list.sort((a, b) => a.kickoffMs - b.kickoffMs);
  }

  return { byMatchId, byEspnEventId, byPair };
}
