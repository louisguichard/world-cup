import { describe, expect, it } from "vitest";
import { matchCompositeKey, pairKey } from "./normalize";

describe("matchCompositeKey", () => {
  it("is order-independent", () => {
    const a = matchCompositeKey("France", "Brazil", "2026-06-15T18:00:00Z");
    const b = matchCompositeKey("Brazil", "France", "2026-06-15T18:00:00Z");
    expect(a).toBe(b);
  });

  it("uses UTC noon date boundary", () => {
    const morning = matchCompositeKey("USA", "Mexico", "2026-06-12T02:00:00Z");
    const evening = matchCompositeKey("USA", "Mexico", "2026-06-12T22:00:00Z");
    expect(morning).toBe(evening);
  });

  it("pairKey sorts teams", () => {
    expect(pairKey("France", "Brazil")).toBe(pairKey("Brazil", "France"));
  });
});
