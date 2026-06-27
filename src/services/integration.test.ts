import { describe, expect, it } from "vitest";
import { parseEspnScoreboard } from "./ESPNClient";
import { enrichMatchWithScheduleId } from "./ScheduleLinker";
import { getBroadcast } from "./BroadcastLookup";
import { applyLiveScore } from "./DataMerger";
import { fetchEspnWorldCupScoreboard, skipIfOffline } from "../test/helpers/espnIntegration";

describe("integration: ESPN → schedule link", () => {
  it("links most group-stage matches and resolves broadcast chips", async () => {
    const sb = await fetchEspnWorldCupScoreboard();
    skipIfOffline(sb, (payload) => {
      const { teams, matches } = parseEspnScoreboard(payload);
      const teamsMap = Object.fromEntries(teams.map((t) => [t.id, t]));

      let linked = 0;
      let groupLinked = 0;
      let withBroadcast = 0;

      for (const m of matches) {
        const merged = enrichMatchWithScheduleId(
          applyLiveScore(undefined, { ...m, espnEventId: m.id }, "espn"),
          teamsMap
        );
        if (merged.matchId) {
          linked++;
          if (m.group) groupLinked++;
          if (getBroadcast(merged.matchId)) withBroadcast++;
        }
      }

      const groupMatches = matches.filter((m) => m.group);
      const knockoutMatches = matches.filter((m) => !m.group);

      expect(groupMatches.length).toBeGreaterThanOrEqual(70);
      expect(groupLinked / groupMatches.length).toBeGreaterThan(0.95);
      expect(linked).toBeGreaterThanOrEqual(70);
      expect(withBroadcast).toBeGreaterThanOrEqual(70);
      expect(knockoutMatches.length).toBeGreaterThan(0);
    });
  }, 15_000);
});
