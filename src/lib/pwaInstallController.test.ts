import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canTriggerNativeInstall,
  dismissPwaInstall,
  isPwaInstallDismissed,
  resolveInstallGuideKind,
} from "./pwaInstallController";

function stubStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe("pwaInstallController", () => {
  beforeEach(() => {
    stubStorage();
    vi.stubGlobal("window", { addEventListener: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks dismissed state in localStorage", () => {
    expect(isPwaInstallDismissed()).toBe(false);
    dismissPwaInstall();
    expect(isPwaInstallDismissed()).toBe(true);
  });

  it("reports no native prompt before beforeinstallprompt fires", () => {
    expect(canTriggerNativeInstall()).toBe(false);
  });

  it("resolves iOS guide kind", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(resolveInstallGuideKind()).toBe("ios");
  });

  it("resolves Android guide kind", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
      platform: "Linux",
      maxTouchPoints: 5,
    });
    expect(resolveInstallGuideKind()).toBe("android");
  });

  it("resolves desktop Chrome guide kind", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(resolveInstallGuideKind()).toBe("desktop-chrome");
  });
});
