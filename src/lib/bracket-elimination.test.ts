import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildQualificationContext,
  deriveStandingsIfScored
} from "./qualification";
import { isKnockoutEliminated } from "./thirdPlaceQualification";
import { projectTournament } from "./tournament";
import type { Match, Team } from "../types";

function groupFromNote(note?: string): string | undefined {
  const match = note?.match(/Group ([A-L])/);
  return match?.[1];
}

function parseSnapshot(raw: unknown): { teams: Team[]; matches: Match[] } {
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

    const homeId = home.team.id;
    const awayId = away.team.id;

    for (const c of [home, away]) {
      const id = c.team!.id!;
      if (!teams.has(id)) {
        teams.set(id, {
          id,
          name: c.team!.displayName ?? id,
          shortName: c.team!.abbreviation ?? id,
          abbreviation: c.team!.abbreviation ?? id.slice(0, 3).toUpperCase(),
          group: group as Team["group"],
          rating: 1500
        });
      }
    }

    const completed = Boolean(comp.status?.type?.completed);
    matches.push({
      id: e.id ?? `${homeId}-${awayId}`,
      date: comp.date ?? e.date ?? "",
      homeTeamId: homeId,
      awayTeamId: awayId,
      group: group as Match["group"],
      status: completed ? "completed" : "scheduled",
      locked: completed,
      homeScore: completed ? Number(home.score ?? 0) : undefined,
      awayScore: completed ? Number(away.score ?? 0) : undefined,
      homeConduct: 0,
      awayConduct: 0,
      source: "espn"
    });
  }

  return { teams: [...teams.values()], matches };
}

function collectBracketViolations(
  bracket: ReturnType<typeof projectTournament>["bracket"],
  standings: ReturnType<typeof deriveStandingsIfScored>,
  context: ReturnType<typeof buildQualificationContext>,
  teamsById: Map<string, Team>
) {
  const violations: Array<{ match: string; role: string; teamId: string; name?: string; frequency?: number }> = [];

  for (const m of bracket) {
    for (const [side, teamId] of [
      ["home", m.homeTeamId],
      ["away", m.awayTeamId]
    ] as const) {
      if (teamId && isKnockoutEliminated(teamId, standings!, context)) {
        violations.push({ match: m.id, role: side, teamId, name: teamsById.get(teamId)?.name });
      }
    }
    for (const g of [...(m.homeGhosts ?? []), ...(m.awayGhosts ?? [])]) {
      if (isKnockoutEliminated(g.teamId, standings!, context)) {
        violations.push({
          match: m.id,
          role: "ghost",
          teamId: g.teamId,
          name: teamsById.get(g.teamId)?.name,
          frequency: g.frequency
        });
      }
    }
  }

  return violations;
}

describe("bracket projection — eliminated teams", () => {
  const raw = JSON.parse(readFileSync(new URL("../../.cursor/audit-espn-snapshot.json", import.meta.url), "utf8"));
  const { teams, matches } = parseSnapshot(raw);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const scored = matches.filter((m) => m.homeScore !== undefined);
  const standings = deriveStandingsIfScored(scored, teams)!;
  const context = buildQualificationContext(matches, teams);
  const projection = projectTournament(
    teams,
    scored,
    [],
    {},
    {},
    context.lockedGroupMatchCount,
    context.lockedStandingsByGroup
  );

  it("excludes eliminated teams from bracket slots and ghosts", () => {
    const violations = collectBracketViolations(projection.bracket, standings, context, teamsById);
    // This test will fail until fix — captures runtime evidence
    const qatar = teams.find((t) => t.name === "Qatar");
    const qatarHits = violations.filter((v) => v.teamId === qatar?.id);
    if (qatarHits.length > 0) {
      console.log("Qatar bracket violations:", qatarHits);
    }
    expect(violations).toEqual([]);
  });
});
