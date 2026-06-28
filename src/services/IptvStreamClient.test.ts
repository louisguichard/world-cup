import { describe, expect, it } from "vitest";
import { iptvStreamEndpoints } from "../config/iptvStreamEndpoints";
import {
  buildXtreamLiveStreamUrl,
  buildXtreamM3uUrl,
  findIptvChannelsForFixture,
} from "../services/IptvStreamClient";

describe("iptvStreamEndpoints", () => {
  it("builds daily xtream path", () => {
    expect(iptvStreamEndpoints.dailyXtreamGet()).toBe("/get");
  });

  it("builds subscribe path with country", () => {
    expect(iptvStreamEndpoints.subscribeNoAdults({ countryCode: "FR" })).toBe(
      "/subscribe/1year_no_adults?countryCode=FR"
    );
  });

  it("builds tvview getAll path", () => {
    expect(iptvStreamEndpoints.tvViewGetAll()).toBe("/getAll");
  });
});

describe("IptvStreamClient helpers", () => {
  const creds = {
    serverUrl: "example.tv",
    username: "user1",
    password: "pass1",
    port: "8080",
    protocol: "http" as const,
  };

  it("builds m3u playlist url", () => {
    expect(buildXtreamM3uUrl(creds)).toBe(
      "http://example.tv:8080/get.php?username=user1&password=pass1&type=m3u_plus&output=ts"
    );
  });

  it("builds live hls url", () => {
    expect(buildXtreamLiveStreamUrl(creds, 42)).toBe(
      "http://example.tv:8080/live/user1/pass1/42.m3u8"
    );
  });

  it("matches fixture channel names", () => {
    const channels = [
      { streamId: "1", name: "Brazil vs Argentina - World Cup" },
      { streamId: "2", name: "France v Germany" },
      { streamId: "3", name: "Tennis" },
    ];
    const brazil = findIptvChannelsForFixture(channels, "Brazil", "Argentina");
    expect(brazil).toHaveLength(1);
    expect(brazil[0]?.streamId).toBe("1");

    const france = findIptvChannelsForFixture(channels, "France", "Germany");
    expect(france).toHaveLength(1);
  });
});
