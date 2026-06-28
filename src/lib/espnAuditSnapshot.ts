import { readFileSync } from "node:fs";
import { mergeTeamsWithCatalog, resolveCatalogTeamIdByName, withEspnTeamAliases } from "../data/wc2026TeamCatalog";
import { applyLiveScore } from "../services/DataMerger";
import { mergeEspnMatchIntoStore } from "../services/espnMatchMerge";
import { buildQualificationContext, deriveStandingsIfScored } from "./qualification";
import type { Match, MergedMatch, Team } from "../types";

export type EspnAuditDataset = {
  teams: Record<string, Team>;
  matches: MergedMatch[];
  standings: NonNullable<ReturnType<typeof deriveStandingsIfScored>>;
  context: ReturnType<typeof buildQualificationContext>;
};

function groupFromNote(note?: string): string | undefined {
  const match = note?.match(/Group ([A-L])/);
  return match?.[1];
}

function parseEspnTeamsAndMatches(raw: unknown): {
  espnTeams: Record<string, Team>;
  espnMatches: Match[];
} {
  const espnTeams = new Map<string, Team>();
  const espnMatches: Match[] = [];

  for (const event of (raw as { events?: unknown[] }).events ?? []) {
    const e = event as {
      id?: string;
      date?: string;
      competitions?: Array<{
        date?: string;
        altGameNote?: string;
        status?: { type?: { completed?: boolean; state?: string } };
        competitors?: Array<{
          id?: string;
          homeAway?: string;
          team?: { id?: string; displayName?: string; abbreviation?: string };
          score?: string;
        }>;
      }>;
    };

    const comp = e.competitions?.[0];
    if (!comp) continue;
    const group = groupFromNote(comp.altGameNote);
    if (!group) continue;

    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    if (!home?.team?.id || !away?.team?.id) continue;

    for (const competitor of [home, away]) {
      const t = competitor.team!;
      const id = t.id!;
      if (!espnTeams.has(id)) {
        espnTeams.set(id, {
          id,
          name: t.displayName ?? id,
          shortName: t.abbreviation ?? id,
          abbreviation: t.abbreviation ?? id.slice(0, 3).toUpperCase(),
          group: group as Team["group"],
          rating: 1500,
        });
      }
    }

    const completed = Boolean(comp.status?.type?.completed);
    const live = comp.status?.type?.state === "in";
    espnMatches.push({
      id: e.id ?? `${home.team.id}-${away.team.id}`,
      date: comp.date ?? e.date ?? "",
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      group: group as Match["group"],
      status: completed ? "completed" : live ? "live" : "scheduled",
      locked: completed,
      homeScore: completed || live ? Number(home.score ?? 0) : undefined,
      awayScore: completed || live ? Number(away.score ?? 0) : undefined,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn",
    });
  }

  return { espnTeams: Object.fromEntries(espnTeams), espnMatches };
}

function buildStaticShellMatches(teams: Record<string, Team>): Record<string, MergedMatch> {
  const schedule = JSON.parse(
    readFileSync(new URL("../data/matchSchedule.json", import.meta.url), "utf8")
  ) as {
    matches: Array<{
      matchNumber: number;
      group?: string;
      homeTeam: string;
      awayTeam: string;
      kickoff: { utc: string };
      venue: { name: string; city: string };
      espnEventId?: string;
    }>;
  };

  const byName = new Map<string, string>();
  for (const team of Object.values(teams)) {
    byName.set(team.name.toLowerCase(), team.id);
    byName.set(team.shortName.toLowerCase(), team.id);
    byName.set(team.abbreviation.toLowerCase(), team.id);
  }

  const resolveTeamId = (label: string) =>
    resolveCatalogTeamIdByName(label) ?? byName.get(label.toLowerCase()) ?? label.toLowerCase();
  const matches: Record<string, MergedMatch> = {};

  for (const entry of schedule.matches) {
    const matchId = `M${entry.matchNumber}`;
    matches[matchId] = {
      id: matchId,
      matchId,
      date: entry.kickoff.utc,
      venue: `${entry.venue.name}, ${entry.venue.city}`,
      homeTeamId: resolveTeamId(entry.homeTeam),
      awayTeamId: resolveTeamId(entry.awayTeam),
      status: "scheduled",
      homeConduct: 0,
      awayConduct: 0,
      locked: false,
      source: "model",
      group: entry.group as MergedMatch["group"],
      espnEventId: entry.espnEventId,
    };
  }

  return matches;
}

/** Parse frozen or live ESPN JSON using the same merge path as production boot. */
export function buildEspnAuditDataset(raw: unknown): EspnAuditDataset {
  const { espnTeams, espnMatches } = parseEspnTeamsAndMatches(raw);
  const teams = withEspnTeamAliases(mergeTeamsWithCatalog(espnTeams), espnTeams);
  const merged: Record<string, MergedMatch> = buildStaticShellMatches(teams);

  for (const match of espnMatches) {
    const incoming = applyLiveScore(undefined, { ...match, espnEventId: match.id }, "espn");
    mergeEspnMatchIntoStore(merged, incoming, teams);
  }

  const matches = Object.values(merged).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const teamList = Object.values(teams).filter((team) => team.id === team.id.toLowerCase());
  const standings = deriveStandingsIfScored(matches, teamList)!;
  const context = buildQualificationContext(matches, teamList);

  return { teams, matches, standings, context };
}

export function loadEspnAuditDatasetFromFile(path: URL): EspnAuditDataset {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return buildEspnAuditDataset(raw);
}
