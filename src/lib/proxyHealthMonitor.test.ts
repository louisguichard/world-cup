import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  hasDeadProxies,
  listDeadProxies,
  markProxyDead,
  resetProxyHealthForTests,
} from "./proxyHealthMonitor";

vi.mock("../config/apiFlags", () => ({
  isApiEnabled: () => true,
}));

vi.mock("../services/SportAPI7Client", () => ({
  isSportAPI7Disabled: () => false,
}));

vi.mock("../services/WeatherClient", () => ({
  isWeatherDisabled: () => false,
}));

vi.mock("../services/WorldCup2026Client", () => ({
  isWorldCup2026Disabled: () => false,
}));

describe("proxyHealthMonitor", () => {
  beforeEach(() => {
    resetProxyHealthForTests();
  });

  it("starts with no dead proxies", () => {
    expect(hasDeadProxies()).toBe(false);
    expect(listDeadProxies()).toHaveLength(0);
  });

  it("marks a proxy dead with reason", () => {
    markProxyDead("sportapi7", "HTTP 502");

    const dead = listDeadProxies();
    expect(dead).toHaveLength(1);
    expect(dead[0]?.id).toBe("sportapi7");
    expect(dead[0]?.reason).toBe("HTTP 502");
    expect(hasDeadProxies()).toBe(true);
  });
});
