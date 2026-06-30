import { beforeAll, describe, expect, it } from "vitest";
import catalog from "../../data/generated/paninarrCatalog.json";
import searchIndex from "../../data/generated/paninarrSearchIndex.json";
import teamStickers from "../../data/generated/paninarrTeamStickers.json";
import { imageAssetService } from "./ImageAssetService";

describe("paninarr catalog bundle", () => {
  beforeAll(() => {
    imageAssetService.ensureLoadedSyncForTests(catalog as never, searchIndex as never);
  });

  it("has expected entity counts", () => {
    const c = catalog as {
      players: unknown[];
      managers: unknown[];
      stadiums: unknown[];
      hostCities: unknown[];
      legends: unknown[];
      trophies: unknown[];
    };
    expect(c.players).toHaveLength(1248);
    expect(c.managers).toHaveLength(48);
    expect(c.stadiums).toHaveLength(16);
    expect(c.hostCities).toHaveLength(16);
    expect(c.legends).toHaveLength(24);
    expect(c.trophies).toHaveLength(4);
    expect(Object.keys((teamStickers as { teamStickers: Record<string, string> }).teamStickers)).toHaveLength(
      48
    );
  });

  it("uses https image URLs", () => {
    const c = catalog as { players: { imageUrl?: string }[] };
    for (const player of c.players) {
      if (player.imageUrl) {
        expect(player.imageUrl.startsWith("https://")).toBe(true);
      }
    }
  });

  it("search index is populated", () => {
    const idx = searchIndex as { entries: unknown[] };
    expect(idx.entries.length).toBeGreaterThan(1300);
  });
});

describe("ImageAssetService", () => {
  it("returns Brazil captain sticker", () => {
    const sticker = imageAssetService.getTeamSticker("bra");
    expect(sticker?.imageUrl).toMatch(/^https:\/\//);
  });

  it("finds Neymar headshot by name", () => {
    const photo = imageAssetService.getPlayerHeadshot({ teamId: "bra", playerName: "Neymar" });
    expect(photo?.imageUrl).toMatch(/^https:\/\//);
  });

  it("returns Miami stadium hero", () => {
    const hero = imageAssetService.getStadiumHero("miami");
    expect(hero?.imageUrl).toMatch(/^https:\/\//);
  });

  it("searches legends", () => {
    const results = imageAssetService.searchStickers("pele");
    expect(results.some((r) => r.type === "legend")).toBe(true);
  });

  it("returns manager headshot for team", () => {
    const mgr = imageAssetService.getManagerHeadshot("bra");
    expect(mgr?.imageUrl).toMatch(/^https:\/\//);
  });
});
