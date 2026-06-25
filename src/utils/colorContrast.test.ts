import { describe, expect, it } from "vitest";
import { normalizeHex, pickOnPrimary } from "./colorContrast";

describe("colorContrast", () => {
  it("normalizes ESPN hex without hash", () => {
    expect(normalizeHex("009C3B")).toBe("#009C3B");
    expect(normalizeHex("#009C3B")).toBe("#009C3B");
  });

  it("picks white text on dark primary", () => {
    expect(pickOnPrimary("#002868")).toBe("#FFFFFF");
  });

  it("picks black text on light primary", () => {
    expect(pickOnPrimary("#FFDF00")).toBe("#000000");
  });
});
