import { describe, expect, it } from "vitest";
import { mergeTeamPartials } from "../adapters/normalizeTeam";

describe("mergeTeamPartials", () => {
  it("fills gaps from later partials without overwriting", () => {
    const merged = mergeTeamPartials(
      { name: "Brazil", abbreviation: "BRA" },
      { logo: "https://example.com/bra.svg", abbreviation: "BRZ" }
    );
    expect(merged.name).toBe("Brazil");
    expect(merged.abbreviation).toBe("BRA");
    expect(merged.logo).toBe("https://example.com/bra.svg");
  });

  it("prefers first non-empty logo", () => {
    const merged = mergeTeamPartials(
      { logo: "https://zafronix.com/bra.svg" },
      { logo: "https://wc2026.com/bra.png" }
    );
    expect(merged.logo).toBe("https://zafronix.com/bra.svg");
  });
});
