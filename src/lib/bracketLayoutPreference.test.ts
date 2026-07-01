import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  readStoredBracketLayoutMode,
  writeStoredBracketLayoutMode,
  hasStoredBracketLayoutPreference,
  preferTreeLayoutForKnockoutIfUnset,
  BRACKET_LAYOUT_STORAGE_KEY,
} from "./bracketLayoutPreference";

describe("bracketLayoutPreference", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists user layout choice", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    });

    writeStoredBracketLayoutMode("tree");
    expect(storage.get(BRACKET_LAYOUT_STORAGE_KEY)).toBe("tree");
    expect(readStoredBracketLayoutMode()).toBe("tree");
    expect(hasStoredBracketLayoutPreference()).toBe(true);
  });

  it("prefers tree during knockout on desktop when unset", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
    });
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("1024"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });

    expect(hasStoredBracketLayoutPreference()).toBe(false);
    expect(preferTreeLayoutForKnockoutIfUnset(true)).toBe("tree");
    expect(preferTreeLayoutForKnockoutIfUnset(false)).toBeNull();
  });

  it("does not override when user saved schedule layout", () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === BRACKET_LAYOUT_STORAGE_KEY ? "schedule" : null),
      setItem: () => {},
    });
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }),
    });

    expect(preferTreeLayoutForKnockoutIfUnset(true)).toBeNull();
  });
});
