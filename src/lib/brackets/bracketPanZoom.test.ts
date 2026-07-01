import { describe, expect, it } from "vitest";
import {
  clampScale,
  computeFitTransform,
  panBy,
  zoomAtPoint,
} from "./bracketPanZoom";

describe("bracketPanZoom", () => {
  it("clamps scale to configured limits", () => {
    expect(clampScale(0.1)).toBe(0.35);
    expect(clampScale(5)).toBe(2.5);
    expect(clampScale(1)).toBe(1);
  });

  it("zooms around a focal point", () => {
    const start = { scale: 1, translateX: 0, translateY: 0 };
    const zoomed = zoomAtPoint(start, 100, 50, 2);

    expect(zoomed.scale).toBe(2);
    expect(zoomed.translateX).toBe(-100);
    expect(zoomed.translateY).toBe(-50);
  });

  it("pans by delta", () => {
    const moved = panBy({ scale: 1, translateX: 10, translateY: 20 }, 5, -3);
    expect(moved.translateX).toBe(15);
    expect(moved.translateY).toBe(17);
  });

  it("fits content inside viewport without upscaling beyond 1", () => {
    const fit = computeFitTransform(1200, 800, 2400, 1200);
    expect(fit.scale).toBeLessThanOrEqual(1);
    expect(fit.translateX).toBeGreaterThan(0);
    expect(fit.translateY).toBeGreaterThan(0);
  });
});
