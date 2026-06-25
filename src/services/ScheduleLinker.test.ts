import { describe, expect, it } from "vitest";
import { matchCompositeKey } from "../lib/normalize";
import {
  buildScheduleLinkIndex,
  formatKickoffLocal,
  linkMatchToSchedule
} from "./ScheduleLinker";
import type { MatchScheduleEntry, Team } from "../types";

const sampleEntries: MatchScheduleEntry[] = [
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
        english: { network: "FOX" },
        spanish: { network: "Telemundo" }
      }
    }
  },
  {
    matchNumber: 4,
    stage: "group",
    group: "C",
    homeTeam: "United States",
    awayTeam: "Paraguay",
    kickoff: { utc: "2026-06-12T22:00:00Z" },
    venue: { name: "SoFi Stadium", city: "Inglewood", country: "USA" },
    broadcast: {
      USA: {
        english: { network: "FOX" },
        spanish: { network: "Telemundo" }
      }
    }
  }
];

const teams: Record<string, Team> = {
  mex: {
    id: "mex",
    name: "Mexico",
    shortName: "MEX",
    abbreviation: "MEX",
    group: "A",
    rating: 1500
  },
  rsa: {
    id: "rsa",
    name: "South Africa",
    shortName: "RSA",
    abbreviation: "RSA",
    group: "A",
    rating: 1400
  },
  usa: {
    id: "usa",
    name: "United States",
    shortName: "USA",
    abbreviation: "USA",
    group: "C",
    rating: 1550
  },
  par: {
    id: "par",
    name: "Paraguay",
    shortName: "PAR",
    abbreviation: "PAR",
    group: "C",
    rating: 1450
  }
};

describe("ScheduleLinker", () => {
  it("links via team pair regardless of ESPN kickoff drift", () => {
    const indices = buildScheduleLinkIndex(sampleEntries);
    expect(indices.pair["mexico__southafrica"]).toBe("M1");
    expect(indices.pair["paraguay__unitedstates"]).toBe("M4");

    const matchId = linkMatchToSchedule(
      {
        homeTeamId: "usa",
        awayTeamId: "par",
        date: "2026-06-13T01:00Z"
      },
      teams
    );

    expect(matchId).toBe("M4");
  });

  it("falls back to normalized kickoff", () => {
    const indices = buildScheduleLinkIndex(sampleEntries);
    expect(indices.kickoff["2026-06-11T19:00:00.000Z"]).toBe("M1");

    const matchId = linkMatchToSchedule({ date: "2026-06-11T19:00Z" }, {});
    expect(matchId).toBe("M1");
  });

  it("formats kickoff in local timezone", () => {
    const formatted = formatKickoffLocal("2026-06-11T19:00:00Z");
    expect(formatted.length).toBeGreaterThan(5);
  });
});
