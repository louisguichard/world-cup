import { describe, expect, it } from "vitest";
import {
  FLASHLIVE_DEFAULT_LOCALE,
  FLASHLIVE_SAMPLE_EVENT_ID,
  FLASHLIVE_SAMPLE_TEAM_ID,
  flashliveEndpoints,
} from "../config/flashliveEndpoints";

describe("flashliveEndpoints", () => {
  it("builds sports list path", () => {
    expect(flashliveEndpoints.sportsList()).toBe("/v1/sports/list");
  });

  it("builds team transfers path from user example", () => {
    const path = flashliveEndpoints.teamTransfers({
      team_id: "Wtn9Stg0",
      page: 1,
      locale: "en_INT",
    });
    expect(path).toBe("/v1/teams/transfers?team_id=Wtn9Stg0&page=1&locale=en_INT");
  });

  it("builds events list with defaults", () => {
    const path = flashliveEndpoints.eventsList({});
    expect(path).toContain("/v1/events/list?");
    expect(path).toContain("sport_id=1");
    expect(path).toContain(`locale=${FLASHLIVE_DEFAULT_LOCALE}`);
  });

  it("builds event detail paths with sample id", () => {
    expect(flashliveEndpoints.eventStatistics(FLASHLIVE_SAMPLE_EVENT_ID)).toContain(
      `event_id=${FLASHLIVE_SAMPLE_EVENT_ID}`
    );
    expect(flashliveEndpoints.eventDetails(FLASHLIVE_SAMPLE_EVENT_ID)).toContain("/v1/events/details");
  });

  it("builds team data path", () => {
    expect(flashliveEndpoints.teamData(FLASHLIVE_SAMPLE_TEAM_ID)).toContain(
      `team_id=${FLASHLIVE_SAMPLE_TEAM_ID}`
    );
  });
});
