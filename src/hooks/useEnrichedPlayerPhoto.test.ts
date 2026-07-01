import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolvePlayerPhotoUrlSync } from "../services/playerProfile/resolveEventPlayerPhotos";

vi.mock("../services/WorldCup2026Client", () => ({
  lookupWc2026Player: vi.fn(() => undefined),
  isWorldCup2026Disabled: () => true,
}));

vi.mock("../services/paninarr/ImageAssetService", () => ({
  imageAssetService: {
    getPlayerHeadshot: vi.fn(() => ({ imageUrl: "https://example.com/panini.jpg" })),
  },
  ensurePaninarrCatalogLoaded: vi.fn(async () => undefined),
}));

describe("resolvePlayerPhotoUrlSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves Panini headshot by player name", () => {
    const url = resolvePlayerPhotoUrlSync("Neymar", "bra");
    expect(url).toBe("https://example.com/panini.jpg");
  });
});
