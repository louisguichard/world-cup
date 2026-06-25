import { describe, expect, it } from "vitest";
import { buildBroadcastIndex, getBroadcast, getBroadcastByKickoff } from "./BroadcastLookup";
import type { MatchScheduleEntry } from "../types";

const sample: MatchScheduleEntry[] = [
  {
    matchNumber: 1,
    stage: "group",
    group: "A",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    kickoff: { utc: "2026-06-11T19:00:00Z" },
    venue: { name: "Estadio Azteca", city: "Mexico City", country: "Mexico" },
    broadcast: {
      USA: {
        english: { network: "FOX (English)", streaming: "FOX Sports app, fuboTV" },
        spanish: { network: "Telemundo (Spanish)", streaming: "Peacock, Telemundo app" },
        concurrentMatchNote: null
      }
    }
  },
  {
    matchNumber: 73,
    stage: "knockout",
    homeTeam: "TBD",
    awayTeam: "TBD",
    kickoff: { utc: "2026-07-05T20:00:00Z" },
    venue: { name: "Stadium", city: "City", country: "USA" },
    broadcast: {
      USA: {
        english: { network: "FS1", streaming: "Fox Sports app" },
        spanish: { network: "Universo", streaming: "Peacock" },
        concurrentMatchNote: "Concurrent with another match on FOX"
      }
    }
  }
];

describe("BroadcastLookup", () => {
  it("indexes M{n} with normalized USA networks and streaming", () => {
    const index = buildBroadcastIndex(sample);
    const m1 = index.M1;

    expect(m1).toBeDefined();
    expect(m1?.englishNetwork).toBe("FOX");
    expect(m1?.spanishNetwork).toBe("Telemundo");
    expect(m1?.streaming).toEqual(
      expect.arrayContaining(["FOX Sports app", "fuboTV", "Peacock", "Telemundo app"])
    );
    expect(m1?.isConcurrent).toBe(false);
  });

  it("flags concurrent matches", () => {
    const index = buildBroadcastIndex(sample);
    expect(index.M73?.isConcurrent).toBe(true);
    expect(index.M73?.englishNetwork).toBe("FS1");
  });

  it("getBroadcast returns chip for full schedule M1", () => {
    const chip = getBroadcast("M1");
    expect(chip?.matchId).toBe("M1");
    expect(chip?.kickoffUTC).toBe("2026-06-11T19:00:00Z");
  });

  it("getBroadcastByKickoff normalizes ESPN kickoff format", () => {
    const chip = getBroadcastByKickoff("2026-06-11T19:00Z");
    expect(chip?.matchId).toBe("M1");
  });
});
