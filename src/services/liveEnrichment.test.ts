import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchEnrichmentEvents } from "./liveEnrichment";

vi.mock("../config/apiFlags", () => ({
  isApiEnabled: (id: string) =>
    id === "footballDataApi" || id === "sportApi7" || id === "sofascore",
}));

vi.mock("./FootballDataClient", () => ({
  fetchScheduledToday: vi.fn(),
  isFootballDataDisabled: () => false,
}));

vi.mock("./SportAPI7Client", () => ({
  fetchScheduledToday: vi.fn(),
  isSportAPI7Disabled: () => false,
}));

vi.mock("./SofaScoreClient", () => ({
  fetchScheduledToday: vi.fn(),
  isSofaScoreDisabled: () => false,
}));

import { fetchScheduledToday as fetchFootballDataToday } from "./FootballDataClient";
import { fetchScheduledToday as fetchSportApiToday } from "./SportAPI7Client";
import { fetchScheduledToday as fetchSofaToday } from "./SofaScoreClient";

const mockEvent = {
  id: 1,
  startTimestamp: 0,
  homeTeam: { id: 1, name: "A" },
  awayTeam: { id: 2, name: "B" },
  status: { type: "notstarted" },
};

describe("fetchEnrichmentEvents", () => {
  beforeEach(() => {
    vi.mocked(fetchFootballDataToday).mockReset();
    vi.mocked(fetchSportApiToday).mockReset();
    vi.mocked(fetchSofaToday).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prefers FootballData when it returns events", async () => {
    vi.mocked(fetchFootballDataToday).mockResolvedValue([mockEvent]);
    vi.mocked(fetchSportApiToday).mockResolvedValue([{ ...mockEvent, id: 2 }]);
    vi.mocked(fetchSofaToday).mockResolvedValue([{ ...mockEvent, id: 3 }]);

    const result = await fetchEnrichmentEvents();
    expect(result.source).toBe("footballData");
    expect(result.events).toHaveLength(1);
    expect(fetchSportApiToday).not.toHaveBeenCalled();
    expect(fetchSofaToday).not.toHaveBeenCalled();
  });

  it("falls back to SofaScore6 when FootballData is empty", async () => {
    vi.mocked(fetchFootballDataToday).mockResolvedValue([]);
    vi.mocked(fetchSportApiToday).mockResolvedValue([mockEvent]);
    vi.mocked(fetchSofaToday).mockResolvedValue([{ ...mockEvent, id: 3 }]);

    const result = await fetchEnrichmentEvents();
    expect(result.source).toBe("sofascore");
    expect(fetchSportApiToday).not.toHaveBeenCalled();
  });

  it("falls back to SportAPI7 alias when FootballData and SofaScore are empty", async () => {
    vi.mocked(fetchFootballDataToday).mockResolvedValue([]);
    vi.mocked(fetchSportApiToday).mockResolvedValue([mockEvent]);
    vi.mocked(fetchSofaToday).mockResolvedValue([]);

    const result = await fetchEnrichmentEvents();
    expect(result.source).toBe("sportApi7");
  });

  it("returns none when all sources are empty", async () => {
    vi.mocked(fetchFootballDataToday).mockResolvedValue([]);
    vi.mocked(fetchSportApiToday).mockResolvedValue([]);
    vi.mocked(fetchSofaToday).mockResolvedValue([]);

    const result = await fetchEnrichmentEvents();
    expect(result.source).toBe("none");
  });
});
