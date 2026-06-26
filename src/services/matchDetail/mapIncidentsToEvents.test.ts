import { describe, expect, it } from "vitest";
import { mapIncidentsToEvents, type RawIncident } from "./mapIncidentsToEvents";

const HOME = "USA";
const AWAY = "MEX";

describe("mapIncidentsToEvents", () => {
  it("maps a goal incident", () => {
    const raw: RawIncident[] = [
      { id: "1", minute: 35, type: "goal", team: "home", playerName: "Pulisic" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "goal",
      minute: 35,
      teamId: HOME,
      playerName: "Pulisic"
    });
  });

  it("maps a yellow_card incident", () => {
    const raw: RawIncident[] = [
      { id: "2", minute: 60, incidentType: "yellow_card", team: "away", playerName: "Hernandez" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events[0].type).toBe("yellow_card");
    expect(events[0].teamId).toBe(AWAY);
  });

  it("maps a substitution", () => {
    const raw: RawIncident[] = [
      { id: "3", minute: 70, type: "substitution", homeTeam: true, playerName: "Reyna", assistPlayerName: "Adams" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events[0].type).toBe("substitution");
    expect(events[0].assistName).toBe("Adams");
  });

  it("maps a VAR review", () => {
    const raw: RawIncident[] = [
      { id: "4", minute: 88, type: "VAR", team: "home", playerName: "Turner", varOutcome: "confirmed" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events[0].type).toBe("var_review");
    expect(events[0].varOutcome).toBe("confirmed");
    expect(events[0].isVarReviewed).toBe(true);
  });

  it("maps an own_goal incident", () => {
    const raw: RawIncident[] = [
      { id: "5", minute: 12, type: "own_goal", team: "away", player: { name: "Lopez" } }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events[0].type).toBe("own_goal");
    expect(events[0].playerName).toBe("Lopez");
  });

  it("skips unknown incident types", () => {
    const raw: RawIncident[] = [
      { id: "6", minute: 50, type: "unknown_type", team: "home" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events).toHaveLength(0);
  });

  it("sorts events chronologically", () => {
    const raw: RawIncident[] = [
      { id: "c", minute: 80, type: "goal", team: "home", playerName: "C" },
      { id: "a", minute: 12, type: "goal", team: "away", playerName: "A" },
      { id: "b", minute: 45, type: "yellow_card", team: "home", playerName: "B" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events.map((e) => e.minute)).toEqual([12, 45, 80]);
  });

  it("handles extra time in minuteExtra", () => {
    const raw: RawIncident[] = [
      { id: "7", minute: 45, minuteExtra: 3, type: "goal", team: "home", playerName: "X" }
    ];
    const events = mapIncidentsToEvents(raw, HOME, AWAY);
    expect(events[0].minuteExtra).toBe(3);
  });
});
