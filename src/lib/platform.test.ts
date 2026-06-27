import { describe, expect, it } from "vitest";
import { detectDisplayMode, detectPlatform, isTouchDevice } from "./platform";

describe("platform", () => {
  it("detects desktop by default in test env", () => {
    expect(detectPlatform()).toBe("desktop");
  });

  it("detects browser display mode in test env", () => {
    expect(detectDisplayMode()).toBe("browser");
  });

  it("reports touch capability from matchMedia", () => {
    expect(typeof isTouchDevice()).toBe("boolean");
  });
});
