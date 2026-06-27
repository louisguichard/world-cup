import { describe, expect, it } from "vitest";
import { resolveCrestDisplay } from "./resolveCrestDisplay";

describe("resolveCrestDisplay", () => {
  it("uses manual white-crest pad for England", () => {
    const crest = resolveCrestDisplay("ENG", "#FFFFFF", "#CE1124", ["#FFFFFF", "#CE1124"]);
    expect(crest.profile).toBe("white-crest");
    expect(crest.pad[0]).not.toBe("#FFFFFF");
    expect(crest.pad[0]).toBe("#001E60");
  });

  it("uses manual pad for Switzerland white cross", () => {
    const crest = resolveCrestDisplay("SUI", "#FF0000", "#FFFFFF", ["#FF0000", "#FFFFFF"]);
    expect(crest.profile).toBe("white-crest");
    expect(crest.pad).toEqual(["#CC0000", "#8B0000"]);
  });

  it("heuristics for unknown team with white primary", () => {
    const crest = resolveCrestDisplay("ZZZ", "#FFFFFF", "#112233", ["#FFFFFF", "#112233"]);
    expect(crest.profile).toBe("white-crest");
    expect(crest.pad[0]).toBe("#112233");
  });

  it("keeps balanced profile for Brazil", () => {
    const crest = resolveCrestDisplay("BRA", "#009C3B", "#FFDF00", ["#009C3B", "#FFDF00"]);
    expect(crest.profile).toBe("balanced");
    expect(crest.pad[0]).toBe("#006B2D");
    expect(crest.inset).toBe("13%");
  });

  it("uses extra inset for wide federation shields", () => {
    const crest = resolveCrestDisplay("COD", "#007FFF", "#FCD116", ["#007FFF", "#FCD116"]);
    expect(crest.inset).toBe("18%");
  });

  it("uses light pad for Mexico green federation crest", () => {
    const crest = resolveCrestDisplay("MEX", "#006847", "#CE1126", ["#006847", "#CE1126"]);
    expect(crest.profile).toBe("dark-crest");
    expect(crest.pad[0]).toBe("#F2EEE6");
    expect(crest.pad[0]).not.toContain("006");
  });
});
