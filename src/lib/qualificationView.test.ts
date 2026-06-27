import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertLiveColumnMutualExclusion,
  assertViewDisplayConsistency,
  assertZeroPctExcludedFromProjected,
  buildQualificationSnapshot,
  deriveLiveColumn,
  deriveQualificationTierView
} from "./qualificationView";
import { deriveStandingsIfScored, buildQualificationContext } from "./qualification";
import type { Match, Team, QualificationStatus } from "../types";

function qual(partial: Partial<QualificationStatus> & Pick<QualificationStatus, "status">): QualificationStatus {
  return {
    certainty: "projected_weak",
    lifeState: "alive",
    canQualify: true,
    projectionScore: 50,
    reason: "test",
    ...partial
  };
}

describe("deriveQualificationTierView", () => {
  it("maps engine statuses to precedence tiers", () => {
    expect(deriveQualificationTierView(qual({ status: "qualified" }))).toBe("qualified");
    expect(deriveQualificationTierView(qual({ status: "at_risk" }))).toBe("alive");
    expect(deriveQualificationTierView(qual({ status: "pending" }))).toBe("alive");
    expect(deriveQualificationTierView(qual({ status: "projected_out" }))).toBe("projected_out");
    expect(
      deriveQualificationTierView(
        qual({ status: "eliminated", canQualify: false, lifeState: "eliminated", projectionScore: 0 })
      )
    ).toBe("eliminated");
  });
});

describe("deriveLiveColumn", () => {
  it("places projected_out alive teams in contention (Option A)", () => {
    expect(deriveLiveColumn("projected_out")).toBe("in_contention");
    expect(deriveLiveColumn("eliminated")).toBe("out");
    expect(deriveLiveColumn("qualified")).toBe("moving_on");
  });
});

function groupFromNote(note?: string) {
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
      source: "espn"
    });
  }

  return { teams: [...teams.values()], matches };
}

describe("frozen ESPN snapshot — live column reconciliation", () => {
  const raw = JSON.parse(readFileSync(new URL("../../.cursor/audit-espn-snapshot.json", import.meta.url), "utf8"));
  const { teams, matches } = parseSnapshot(raw);
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const standings = deriveStandingsIfScored(matches, teams)!;
  const snapshot = buildQualificationSnapshot(teamsById, standings, matches);

  it("has mutually exclusive live columns", () => {
    assertLiveColumnMutualExclusion(snapshot.layout);
    assertViewDisplayConsistency(snapshot.views);
    assertZeroPctExcludedFromProjected(snapshot.views, snapshot.layout);
  });

  it("does not place alive projected_out teams in the out column", () => {
    for (const view of snapshot.views.values()) {
      if (view.tier === "projected_out") {
        expect(view.liveColumn).toBe("in_contention");
        expect(snapshot.layout.out.confirmed).not.toContain(view.teamId);
      }
    }
  });

  it("does not overstate third-place teams as projected-qualified", () => {
    for (const view of snapshot.views.values()) {
      if (view.status.status === "at_risk") {
        expect(view.display.variant).toBe("in-contention");
      }
    }
  });
});

describe("buildQualificationSnapshot", () => {
  it("uses qualification context from matches", () => {
    const teamsById = {
      bra: {
        id: "bra",
        name: "Brazil",
        shortName: "BRA",
        abbreviation: "BRA",
        group: "C" as const,
        rating: 1500
      }
    };
    const standings = deriveStandingsIfScored([], [teamsById.bra]) ?? [];
    const snapshot = buildQualificationSnapshot(teamsById, standings, []);
    expect(snapshot.context).toEqual(buildQualificationContext([], [teamsById.bra]));
  });
});
