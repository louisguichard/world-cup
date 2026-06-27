import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeTeamsWithCatalog } from "../data/wc2026TeamCatalog";
import {
  auditProjectionViolations,
  buildQualificationContext,
  computeQualificationStatus,
  deriveStandingsIfScored,
} from "./qualification";
import { buildQualificationSnapshot } from "./qualificationView";
import { rankAliveBestThirds } from "./thirdPlaceQualification";
import type { Match, Team } from "../types";

function groupFromNote(note?: string) {
  const match = note?.match(/Group ([A-L])/);
  return match?.[1];
}

function parseSnapshot(raw: unknown): { teams: Record<string, Team>; matches: Match[] } {
  const teams = new Map<string, Team>();
  const matches: Match[] = [];

  for (const event of (raw as { events?: unknown[] }).events ?? []) {
    const e = event as {
      id?: string;
      date?: string;
      competitions?: Array<{
        date?: string;
        altGameNote?: string;
        status?: { type?: { completed?: boolean } };
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

    for (const c of [home, away]) {
      const id = c.team!.id!;
      if (!teams.has(id)) {
        teams.set(id, {
          id,
          name: c.team!.displayName ?? id,
          shortName: c.team!.abbreviation ?? id,
          abbreviation: c.team!.abbreviation ?? id.slice(0, 3).toUpperCase(),
          group: group as Team["group"],
          rating: 1500,
        });
      }
    }

    const completed = Boolean(comp.status?.type?.completed);
    matches.push({
      id: e.id ?? `${home.team.id}-${away.team.id}`,
      date: comp.date ?? e.date ?? "",
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      group: group as Match["group"],
      status: completed ? "completed" : "scheduled",
      locked: completed,
      homeScore: completed ? Number(home.score ?? 0) : undefined,
      awayScore: completed ? Number(away.score ?? 0) : undefined,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn",
    });
  }

  return { teams: Object.fromEntries(teams), matches };
}

describe("qualification audit report (canonical IDs, ESPN snapshot)", () => {
  const raw = JSON.parse(
    readFileSync(new URL("../../.cursor/audit-espn-snapshot.json", import.meta.url), "utf8")
  );
  const { teams: espnTeams, matches } = parseSnapshot(raw);
  const teams = mergeTeamsWithCatalog(espnTeams);
  const teamList = Object.values(teams);
  const standings = deriveStandingsIfScored(
    matches.filter((m) => m.homeScore !== undefined),
    teamList
  )!;
  const context = buildQualificationContext(matches, teamList);
  const snapshot = buildQualificationSnapshot(teams, standings, matches);

  it("prints verified team buckets for manual audit", () => {
    const qualifiedConfirmed: string[] = [];
    const qualifiedProjected: string[] = [];
    const eliminated: string[] = [];
    const alive: string[] = [];

    for (const [id, view] of snapshot.views) {
      const name = teams[id]?.name ?? id;
      if (view.tier === "qualified") {
        if (view.status.certainty === "confirmed") qualifiedConfirmed.push(name);
        else qualifiedProjected.push(name);
      } else if (view.tier === "eliminated") {
        eliminated.push(name);
      } else {
        alive.push(`${name} (${view.tier}, ${view.liveColumn})`);
      }
    }

    const best8 = rankAliveBestThirds(standings, context)
      .slice(0, 8)
      .map((r, i) => `${i + 1}. ${teams[r.teamId]?.name ?? r.teamId} (${r.group})`);

    // eslint-disable-next-line no-console -- audit deliverable
    console.log(
      JSON.stringify(
        {
          source: "ESPN scoreboard snapshot (.cursor/audit-espn-snapshot.json)",
          completedMatches: matches.filter((m) => m.locked).length,
          qualifiedConfirmed,
          qualifiedProjected,
          eliminated,
          stillAlive: alive,
          bestEightThirds: best8,
          engineViolations: auditProjectionViolations(Object.keys(teams), standings, context),
        },
        null,
        2
      )
    );

    expect(auditProjectionViolations(Object.keys(teams), standings, context)).toEqual([]);
  });
});
