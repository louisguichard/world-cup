import { describe, expect, it } from "vitest";
import { bracketStageShortLabel } from "./bracketStageLabels";

describe("bracketStageLabels", () => {
  it("uses compact labels for narrow column headers", () => {
    expect(bracketStageShortLabel("ThirdPlace")).toBe("3rd");
    expect(bracketStageShortLabel("R32")).toBe("R32");
    expect(bracketStageShortLabel("Final")).toBe("Final");
  });
});
