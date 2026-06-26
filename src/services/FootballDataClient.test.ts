import { describe, expect, it } from "vitest";
import { mapFotMobMatchToSofaEvent } from "./FootballDataClient";

describe("mapFotMobMatchToSofaEvent", () => {
  it("maps live FotMob match to SofaEvent", () => {
    const event = mapFotMobMatchToSofaEvent({
      id: 42,
      timeTS: 1_700_000_000_000,
      home: { id: 1, name: "Argentina", score: 2 },
      away: { id: 2, name: "France", score: 1 },
      status: {
        ongoing: true,
        liveTime: { short: "67'" },
      },
    });

    expect(event.id).toBe(42);
    expect(event.startTimestamp).toBe(1_700_000_000);
    expect(event.homeTeam.name).toBe("Argentina");
    expect(event.awayTeam.name).toBe("France");
    expect(event.status.type).toBe("inprogress");
    expect(event.status.description).toBe("67'");
    expect(event.homeScore?.current).toBe(2);
    expect(event.awayScore?.current).toBe(1);
  });

  it("maps finished match status", () => {
    const event = mapFotMobMatchToSofaEvent({
      id: 7,
      home: { id: 3, name: "Brazil", score: 0 },
      away: { id: 4, name: "Germany", score: 0 },
      status: { finished: true, reason: { short: "FT" } },
    });

    expect(event.status.type).toBe("finished");
    expect(event.status.description).toBe("FT");
  });
});
