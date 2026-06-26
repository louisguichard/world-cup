import { describe, expect, it } from "vitest";
import {
  SPORTAPI_WC_CATEGORY_ID,
  mapSportApiEventToSofaEvent,
} from "./SportAPI7Client";

describe("SportAPI7Client", () => {
  it("uses World Cup category id 1468", () => {
    expect(SPORTAPI_WC_CATEGORY_ID).toBe(1468);
  });

  it("passes through SofaScore-compatible event shape", () => {
    const input = {
      id: 99,
      startTimestamp: 1_750_000_000,
      homeTeam: { id: 10, name: "USA" },
      awayTeam: { id: 11, name: "Mexico" },
      status: { type: "inprogress", description: "45'" },
      homeScore: { current: 1 },
      awayScore: { current: 0 },
    };

    const event = mapSportApiEventToSofaEvent(input);
    expect(event).toEqual(input);
  });
});
