import { describe, expect, it } from "vitest";
import { mapEspnDetailsToEvents } from "./mapEspnToEvents";

/** Real ESPN scoreboard detail shape (Mexico vs South Africa, audit-espn-snapshot.json). */
const MEXICO_TEAM_ID = "203";
const SOUTH_AFRICA_TEAM_ID = "467";

describe("mapEspnDetailsToEvents", () => {
  it("maps ESPN scoreboard details with athletesInvolved to named events", () => {
    const events = mapEspnDetailsToEvents(
      [
        {
          type: { id: "70", text: "Goal" },
          clock: { value: 513, displayValue: "9'" },
          team: { id: MEXICO_TEAM_ID },
          scoreValue: 1,
          scoringPlay: true,
          redCard: false,
          yellowCard: false,
          ownGoal: false,
          athletesInvolved: [
            {
              id: "233075",
              displayName: "Julián Quiñones",
              shortName: "J. Quiñones",
              fullName: "Julián Quiñones",
              team: { id: MEXICO_TEAM_ID },
            },
          ],
        },
        {
          type: { id: "94", text: "Yellow Card" },
          clock: { value: 981, displayValue: "17'" },
          team: { id: SOUTH_AFRICA_TEAM_ID },
          redCard: false,
          yellowCard: true,
          ownGoal: false,
          athletesInvolved: [
            {
              id: "256691",
              displayName: "Teboho Mokoena",
              shortName: "T. Mokoena",
              fullName: "Teboho Mokoena",
              team: { id: SOUTH_AFRICA_TEAM_ID },
            },
          ],
        },
        {
          type: { id: "93", text: "Red Card" },
          clock: { value: 2940, displayValue: "49'" },
          team: { id: SOUTH_AFRICA_TEAM_ID },
          redCard: true,
          yellowCard: false,
          ownGoal: false,
          athletesInvolved: [
            {
              id: "228595",
              displayName: "Sphephelo Sithole",
              shortName: "S. Sithole",
              fullName: "Sphephelo Sithole",
              team: { id: SOUTH_AFRICA_TEAM_ID },
            },
          ],
        },
      ],
      "760415",
      MEXICO_TEAM_ID,
      SOUTH_AFRICA_TEAM_ID
    );

    expect(events).toHaveLength(3);

    expect(events[0].type).toBe("goal");
    expect(events[0].playerName).toBe("Julián Quiñones");
    expect(events[0].playerId).toBe("233075");
    expect(events[0].teamId).toBe(MEXICO_TEAM_ID);
    expect(events[0].minute).toBe(9);

    expect(events[1].type).toBe("yellow_card");
    expect(events[1].playerName).toBe("Teboho Mokoena");
    expect(events[1].teamId).toBe(SOUTH_AFRICA_TEAM_ID);
    expect(events[1].minute).toBe(17);

    expect(events[2].type).toBe("red_card");
    expect(events[2].playerName).toBe("Sphephelo Sithole");
    expect(events[2].teamId).toBe(SOUTH_AFRICA_TEAM_ID);
    expect(events[2].minute).toBe(49);

    for (const event of events) {
      expect(event.playerName).not.toBe("Unknown");
    }
  });

  it("still maps legacy participants when present", () => {
    const events = mapEspnDetailsToEvents(
      [
        {
          type: { text: "Goal" },
          clock: { displayValue: "12'" },
          team: { id: "home-id" },
          participants: [{ type: "scorer", athlete: { displayName: "Player One" } }],
        },
      ],
      "espn-1",
      "home-id",
      "away-id"
    );

    expect(events).toHaveLength(1);
    expect(events[0].playerName).toBe("Player One");
  });
});
