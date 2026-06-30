import { describe, expect, it } from "vitest";
import { normalizeFifaPublicMatch, normalizeFifaPublicLiveMatch } from "./normalizeFifaPublicMatch";

describe("normalizeFifaPublicMatch", () => {
  it("maps matchNumber to M{n} store id", () => {
    const partial = normalizeFifaPublicMatch({
      matchNumber: 12,
      idMatch: "abc-123",
      homeScore: 2,
      awayScore: 1,
      status: "finished",
      dateUtc: "2026-06-15T19:00:00Z",
    });
    expect(partial.id).toBe("M12");
    expect(partial.matchId).toBe("M12");
    expect(partial.fifaMatchId).toBe("abc-123");
    expect(partial.status).toBe("completed");
    expect(partial.homeScore).toBe(2);
    expect(partial.awayScore).toBe(1);
  });

  it("maps live and notStarted statuses", () => {
    expect(
      normalizeFifaPublicMatch({ matchNumber: 1, status: "live" }).status
    ).toBe("live");
    expect(
      normalizeFifaPublicMatch({ matchNumber: 1, status: "notStarted" }).status
    ).toBe("scheduled");
  });
});

describe("normalizeFifaPublicLiveMatch", () => {
  it("prefers nested live score when present", () => {
    const partial = normalizeFifaPublicLiveMatch({
      matchNumber: 5,
      status: "live",
      homeScore: 0,
      awayScore: 0,
      live: {
        status: "live",
        score: { home: 1, away: 0 },
      },
    });
    expect(partial.id).toBe("M5");
    expect(partial.homeScore).toBe(1);
    expect(partial.awayScore).toBe(0);
  });
});
