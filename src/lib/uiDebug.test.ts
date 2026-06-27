import { describe, expect, it } from "vitest";
import { DEFAULT_UI_DEBUG_SETTINGS, viewportSimLabel } from "./uiDebug";

describe("uiDebug", () => {
  it("defaults to disabled native viewport", () => {
    expect(DEFAULT_UI_DEBUG_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_UI_DEBUG_SETTINGS.viewportSim).toBe("native");
  });

  it("labels viewport modes", () => {
    expect(viewportSimLabel("native")).toBe("Native viewport");
    expect(viewportSimLabel("mobile")).toContain("Mobile");
    expect(viewportSimLabel("desktop")).toContain("Desktop");
  });
});
