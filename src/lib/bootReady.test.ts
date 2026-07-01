import { describe, expect, it } from "vitest";
import {
  bootPollRetryMs,
  isBootReady,
  markBootReady,
  resetBootReady,
  waitForBootReady,
} from "./bootReady";

describe("bootReady", () => {
  it("starts not ready until marked", () => {
    resetBootReady();
    expect(isBootReady()).toBe(false);
  });

  it("resolves waitForBootReady after markBootReady", async () => {
    resetBootReady();
    const pending = waitForBootReady(500);
    markBootReady();
    await expect(pending).resolves.toBe(true);
    expect(isBootReady()).toBe(true);
  });

  it("exposes a short poll retry interval while boot pending", () => {
    expect(bootPollRetryMs()).toBeLessThanOrEqual(1_000);
  });
});
