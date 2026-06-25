import { describe, expect, it } from "vitest";
import { groupStageComplete } from "./qualification";

describe("groupStageComplete", () => {
  it("true at 72 completed group matches", () => {
    const matches = Array.from({ length: 72 }, (_, i) => ({
      group: "A",
      status: "completed" as const,
      id: String(i)
    }));
    expect(groupStageComplete(matches)).toBe(true);
  });

  it("false below 72", () => {
    const matches = Array.from({ length: 71 }, () => ({
      group: "A",
      status: "completed" as const
    }));
    expect(groupStageComplete(matches)).toBe(false);
  });
});
