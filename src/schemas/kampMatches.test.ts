import { describe, expect, it } from "vitest";
import { KampMatchesResponseSchema } from "./kampMatches";

describe("KampMatchesResponseSchema", () => {
  it("accepts valid day buckets", () => {
    const parsed = KampMatchesResponseSchema.parse([
      {
        date: "2026-06-11",
        fase: "Fase de Grupos",
        matches: [
          {
            time: "12:00",
            team_1: "México",
            team_2: "África do Sul",
            score_1: 2,
            score_2: 0,
            gols: [{ team: "MEX", player: "Julián Quiñones", minute: 8 }],
            highlights_url: "https://www.youtube.com/results?search_query=test",
          },
        ],
      },
    ]);
    expect(parsed[0]?.matches[0]?.team_1).toBe("México");
  });

  it("rejects malformed payloads", () => {
    expect(() => KampMatchesResponseSchema.parse([{ date: "bad" }])).toThrow();
  });
});
