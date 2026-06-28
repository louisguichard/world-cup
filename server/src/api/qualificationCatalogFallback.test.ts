import { describe, expect, it } from "vitest";
import { getCatalogQualificationFallback } from "../api/qualificationCatalogFallback.js";

describe("getCatalogQualificationFallback", () => {
  it("returns four teams for official group C roster", () => {
    const result = getCatalogQualificationFallback("C");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("computed");
    expect(result?.teams).toHaveLength(4);
    expect(result?.teams.map((t) => t.teamId).sort()).toEqual(
      ["bra", "hai", "mar", "sco"].sort()
    );
  });

  it("returns null for invalid group", () => {
    expect(getCatalogQualificationFallback("Z")).toBeNull();
  });
});
