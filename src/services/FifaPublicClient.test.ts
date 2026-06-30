import { describe, expect, it } from "vitest";
import { FifaPublicMatchesResponseSchema } from "../schemas/fifaPublic";

describe("FifaPublicClient schemas", () => {
  it("parses matches response shape", () => {
    const parsed = FifaPublicMatchesResponseSchema.parse({
      matches: [
        {
          matchNumber: 1,
          home: "Mexico",
          away: "South Africa",
          status: "notStarted",
        },
      ],
    });
    expect(parsed.matches).toHaveLength(1);
    expect(parsed.matches[0].matchNumber).toBe(1);
  });

  it("rejects invalid matches payload", () => {
    expect(() => FifaPublicMatchesResponseSchema.parse({ matches: "bad" })).toThrow();
  });
});
