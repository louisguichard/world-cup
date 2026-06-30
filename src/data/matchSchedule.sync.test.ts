import { describe, expect, it } from "vitest";
import { knockoutSchedule } from "./knockoutSchedule";
import { ROUND_OF_32_FIXTURES } from "../lib/brackets/getR32Slots";
import { KNOCKOUT_ROUND_FIXTURES } from "../lib/brackets/knockoutRoundFixtures";

describe("knockout schedule sync", () => {
  it("has schedule entries for every R32 fixture match id", () => {
    for (const [matchId] of ROUND_OF_32_FIXTURES) {
      expect(knockoutSchedule[matchId], `missing schedule for ${matchId}`).toBeDefined();
    }
  });

  it("has schedule entries for every knockout progression match id", () => {
    for (const fixtures of Object.values(KNOCKOUT_ROUND_FIXTURES)) {
      for (const [matchId] of fixtures) {
        expect(knockoutSchedule[matchId], `missing schedule for ${matchId}`).toBeDefined();
      }
    }
  });
});
