import { describe, expect, it } from "vitest";
import { isGettyImagesPathAllowed } from "../config/gettyImagesEndpoints";
import {
  normalizeGettyImage,
  normalizeGettyImageList,
  pickGettyDisplayUrl,
  toGettyImageRef,
} from "./GettyImagesClient";
import { gettyWorldCupQueries } from "./gettyImages/gettyWorldCupQueries";

describe("gettyImagesEndpoints", () => {
  it("allowlists documented proxy paths", () => {
    expect(isGettyImagesPathAllowed("/getEditorialImagesBySearchQuery")).toBe(true);
    expect(isGettyImagesPathAllowed("/GetPreviousPurchases")).toBe(true);
    expect(isGettyImagesPathAllowed("/unknown")).toBe(false);
  });
});

describe("GettyImagesClient normalize", () => {
  it("picks comp/preview/thumb display url", () => {
    const asset = normalizeGettyImage({
      id: "123",
      title: "World Cup Final",
      display_sizes: [
        { name: "thumb", uri: "https://example.com/thumb.jpg" },
        { name: "comp", uri: "https://example.com/comp.jpg" },
      ],
    });
    expect(pickGettyDisplayUrl(asset!)).toBe("https://example.com/comp.jpg");
    const ref = toGettyImageRef(asset!);
    expect(ref?.credit).toBe("Getty Images");
  });

  it("normalizes image search payloads", () => {
    const result = normalizeGettyImageList({
      result_count: 2,
      images: [{ id: "1", title: "A" }, { id: "2", title: "B" }],
    });
    expect(result.items).toHaveLength(2);
    expect(result.resultCount).toBe(2);
  });
});

describe("gettyWorldCupQueries", () => {
  it("builds venue and fixture phrases", () => {
    expect(gettyWorldCupQueries.tournament()).toContain("2026");
    expect(gettyWorldCupQueries.matchFixture("Brazil", "France")).toContain("Brazil");
    expect(
      gettyWorldCupQueries.venue({
        stadiumName: "Mercedes-Benz Stadium",
        hostCity: "Atlanta",
        fifaOfficialName: "Atlanta Stadium",
      })
    ).toContain("Atlanta");
  });
});
