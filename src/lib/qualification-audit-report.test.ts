import { describe, expect, it } from "vitest";
import {
  auditProjectionViolations,
  computeQualificationStatus,
} from "./qualification";
import { buildQualificationSnapshot } from "./qualificationView";
import { loadEspnAuditDatasetFromFile } from "./espnAuditSnapshot";
import { rankAliveBestThirds } from "./thirdPlaceQualification";

describe("qualification audit report (canonical IDs, ESPN snapshot)", () => {
  const { teams, matches, standings, context } = loadEspnAuditDatasetFromFile(
    new URL("../../.cursor/audit-espn-snapshot.json", import.meta.url)
  );
  const teamList = Object.values(teams).filter((team) => team.id === team.id.toLowerCase());
  const snapshot = buildQualificationSnapshot(teams, standings, matches);

  it("derives non-empty standings from completed ESPN scores", () => {
    const playedRows = standings.flatMap((group) => group.rows.filter((row) => row.played > 0));
    expect(playedRows.length).toBeGreaterThanOrEqual(40);
    expect(matches.filter((match) => match.locked).length).toBeGreaterThanOrEqual(60);
  });

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
      .map((r, i) => `${i + 1}. ${teams[r.teamId]?.name ?? r.teamId} (${r.group}) — ${r.points}pts`);

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
          engineViolations: auditProjectionViolations(teamList.map((t) => t.id), standings, context),
        },
        null,
        2
      )
    );

    expect(auditProjectionViolations(teamList.map((t) => t.id), standings, context)).toEqual([]);
    const bestThirdRows = rankAliveBestThirds(standings, context).slice(0, 8);
    expect(bestThirdRows.every((row) => row.played > 0)).toBe(true);
    expect(bestThirdRows.every((row) => row.points > 0 || row.goalDifference !== 0)).toBe(true);
  });
});
