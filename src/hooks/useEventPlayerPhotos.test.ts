import { describe, expect, it } from "vitest";
import { mergePhotoMaps } from "../services/playerProfile/resolveEventPlayerPhotos";

describe("useEventPlayerPhotos stability", () => {
  it("mergePhotoMaps never downgrades existing photo URLs", () => {
    const prev = { g1: "https://example.com/kept.jpg" };
    const next = { g1: undefined, g2: "https://example.com/new.jpg" };

    const merged = mergePhotoMaps(prev, next);
    expect(merged.g1).toBe("https://example.com/kept.jpg");
    expect(merged.g2).toBe("https://example.com/new.jpg");
  });

  it("mergePhotoMaps returns prev when nothing new is added", () => {
    const prev = { g1: "https://example.com/a.jpg" };
    const next = { g1: undefined };
    expect(mergePhotoMaps(prev, next)).toBe(prev);
  });
});
