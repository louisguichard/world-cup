import { describe, expect, it, vi } from "vitest";
import { fetchWithFallback } from "./FallbackChain";

describe("fetchWithFallback", () => {
  it("returns first successful source", async () => {
    const result = await fetchWithFallback(
      ["wclive", "espn", "static"],
      {
        wclive: async () => {
          throw new Error("down");
        },
        espn: async () => [{ id: "1" }],
      },
      []
    );
    expect(result.source).toBe("espn");
    expect(result.usedFallback).toBe(false);
    expect(result.data).toEqual([{ id: "1" }]);
  });

  it("falls back to static when all fail", async () => {
    const fallback = { teams: [] as string[] };
    const result = await fetchWithFallback(
      ["wclive", "espn", "static"],
      {
        wclive: async () => {
          throw new Error("down");
        },
        espn: async () => {
          throw new Error("down");
        },
      },
      fallback
    );
    expect(result.source).toBe("static");
    expect(result.usedFallback).toBe(true);
    expect(result.data).toBe(fallback);
  });

  it("skips empty arrays and uses the next source", async () => {
    const result = await fetchWithFallback(
      ["wclive", "espn", "static"],
      {
        wclive: async () => [],
        espn: async () => [{ id: "1" }],
      },
      []
    );
    expect(result.source).toBe("espn");
    expect(result.data).toEqual([{ id: "1" }]);
  });

  it("logs failures without throwing", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await fetchWithFallback(
      ["wclive", "static"],
      {
        wclive: async () => {
          throw new Error("network");
        },
      },
      null
    );
    spy.mockRestore();
  });
});
