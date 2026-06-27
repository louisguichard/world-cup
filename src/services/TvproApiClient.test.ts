import { describe, expect, it } from "vitest";
import { TVPRO_CHANNEL_MODS, tvproApiEndpoints } from "../config/tvproApiEndpoints";
import { filterTvproChannels } from "./TvproApiClient";

describe("tvproApiEndpoints", () => {
  it("builds all three documented routes", () => {
    expect(tvproApiEndpoints.channels({ mod: "tv" })).toBe(
      "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv?RapidApi=jlospino&mod=tv"
    );
    expect(tvproApiEndpoints.channels({ mod: "vix" })).toContain("mod=vix");
    expect(tvproApiEndpoints.channels({ mod: "star" })).toContain("mod=star");
    expect(tvproApiEndpoints.token()).toBe(
      "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv/token.php"
    );
    expect(tvproApiEndpoints.channelSearch()).toBe(
      "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv/"
    );
  });

  it("documents all channel mods", () => {
    expect(TVPRO_CHANNEL_MODS).toEqual(["tv", "vix", "star"]);
  });
});

describe("filterTvproChannels", () => {
  it("filters by name substring", () => {
    const channels = [
      { id: "1", name: "FOX Sports" },
      { id: "2", name: "Telemundo" },
    ];
    expect(filterTvproChannels(channels, "fox")).toHaveLength(1);
    expect(filterTvproChannels(channels, "")).toHaveLength(2);
  });
});
