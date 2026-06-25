import { describe, expect, it } from "vitest";
import { createMatchSlice } from "./matchSlice";

describe("mergeMatchEvents", () => {
  it("deduplicates by providerId", () => {
    let state = createMatchSlice(
      (fn) => {
        state = { ...state, ...fn(state) };
      },
      () => state
    );

    state.mergeMatchEvents("m1", [
      { providerId: "g1", minute: 10, type: "goal", teamId: "t1", playerName: "A" }
    ]);
    state.mergeMatchEvents("m1", [
      { providerId: "g1", minute: 10, type: "goal", teamId: "t1", playerName: "A" },
      { providerId: "g2", minute: 55, type: "goal", teamId: "t2", playerName: "B" }
    ]);

    expect(state.matchEvents.m1).toHaveLength(2);
  });
});
