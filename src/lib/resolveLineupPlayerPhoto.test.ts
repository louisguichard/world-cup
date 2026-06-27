import { describe, expect, it, vi } from "vitest";
import { resolveLineupPlayerPhoto } from "./resolveLineupPlayerPhoto";

vi.mock("../services/WorldCup2026Client", () => ({
  getPlayerPhotoUrl: vi.fn((id: string) => (id === "99" ? "https://example.com/id.jpg" : undefined)),
  lookupWc2026Player: vi.fn(({ playerName }: { playerName: string }) =>
    playerName === "Roster Name"
      ? { id: "1", fullName: "Roster Name", image: "https://example.com/roster.jpg" }
      : undefined
  ),
}));

describe("resolveLineupPlayerPhoto", () => {
  it("prefers headshotUrl from feed", () => {
    expect(
      resolveLineupPlayerPhoto({
        id: "1",
        displayName: "A",
        headshotUrl: " https://feed.com/h.jpg ",
      })
    ).toBe("https://feed.com/h.jpg");
  });

  it("falls back to cached player id", () => {
    expect(
      resolveLineupPlayerPhoto({ id: "99", displayName: "Cached" })
    ).toBe("https://example.com/id.jpg");
  });

  it("falls back to roster name lookup", () => {
    expect(
      resolveLineupPlayerPhoto({ id: "x", displayName: "Roster Name" })
    ).toBe("https://example.com/roster.jpg");
  });
});
